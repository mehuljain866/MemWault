"""
MemWault REST API Routes
All endpoints for the PWA frontend to consume.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models import (
    InstagramSession,
    ScrapeLog,
    Story,
    StoryMusic,
    User,
)
from app.schemas import (
    ArchiveImportRequest,
    BrowserLoginResponse,
    DashboardStats,
    InstagramLoginRequest,
    InstagramSessionRead,
    ScrapeLogRead,
    ScrapeRequest,
    StoryListRead,
    StoryLocationRead,
    StoryRead,
    StoryViewerRead,
    TokenResponse,
    UserCreate,
    UserRead,
    AdjacentStoriesRead,
    StoryUpdate,
    StoryBulkUpdate,
)
from app.storage.s3 import get_storage

router = APIRouter()
security = HTTPBearer()


# ── Auth Dependency ──────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and verify the current user from the JWT token."""
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


# ═══════════════════════════════════════════════════════════
# Auth Endpoints
# ═══════════════════════════════════════════════════════════

@router.post("/auth/register", response_model=UserRead, status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new MemWault user."""
    # Check if username exists
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        username=body.username,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: UserCreate, db: AsyncSession = Depends(get_db)):
    """Login and receive a JWT access token."""
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id, user.username)
    return TokenResponse(access_token=token)


@router.get("/auth/me", response_model=UserRead)
async def get_me(user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return user


# ═══════════════════════════════════════════════════════════
# Instagram Session Endpoints
# ═══════════════════════════════════════════════════════════

@router.post("/instagram/login", response_model=InstagramSessionRead)
async def instagram_login(
    body: InstagramLoginRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Connect an Instagram account by logging in with credentials.
    Stores session cookies in the database for cloud polling.
    """
    from app.scraper.instagram import InstagramScraper

    scraper = InstagramScraper(
        username=body.ig_username, 
        password=body.ig_password,
        sessionid=body.sessionid
    )

    try:
        session_data = scraper.login()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Instagram login failed: {e}")

    # Upsert the session
    result = await db.execute(
        select(InstagramSession).where(
            InstagramSession.user_id == user.id,
            InstagramSession.ig_username == body.ig_username,
        )
    )
    ig_session = result.scalar_one_or_none()

    if ig_session:
        ig_session.session_data = session_data
        ig_session.ig_user_id = scraper.user_id
        ig_session.device_settings = scraper.get_device_settings()
        ig_session.is_valid = True
        ig_session.last_login = datetime.now(timezone.utc)
    else:
        ig_session = InstagramSession(
            user_id=user.id,
            ig_username=body.ig_username,
            ig_user_id=scraper.user_id,
            session_data=session_data,
            device_settings=scraper.get_device_settings(),
            is_valid=True,
        )
        db.add(ig_session)

    await db.flush()
    await db.refresh(ig_session)
    return ig_session


@router.post("/instagram/browser-login", response_model=BrowserLoginResponse)
async def instagram_browser_login(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Launch a real browser window for the user to log into Instagram.
    Captures all session cookies after successful login.
    This is the safest method — Instagram cannot distinguish it from a normal login.
    """
    import asyncio
    from app.scraper.browser_login import browser_login
    from app.scraper.instagram import InstagramScraper

    try:
        from starlette.concurrency import run_in_threadpool
        
        def run_browser_sync():
            import asyncio
            import sys
            
            # For Windows, we must use the ProactorEventLoop for Playwright subprocesses
            if sys.platform == "win32":
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
                
            return asyncio.run(browser_login(timeout_ms=300_000))

        # Run the browser login in a separate thread (blocks until the user logs in or timeout)
        login_result = await run_in_threadpool(run_browser_sync)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Browser login failed: {e}")

    cookies = login_result["cookies"]
    ig_username = login_result.get("ig_username", "unknown")
    user_agent = login_result.get("user_agent", "")

    # Create a scraper instance with the full cookie set
    scraper = InstagramScraper(
        username=ig_username,
        web_cookies=cookies,
        web_user_agent=user_agent,
    )
    session_data = scraper.login()

    # Upsert the session
    result = await db.execute(
        select(InstagramSession).where(
            InstagramSession.user_id == user.id,
            InstagramSession.ig_username == ig_username,
        )
    )
    ig_session = result.scalar_one_or_none()

    if ig_session:
        ig_session.session_data = session_data
        ig_session.ig_user_id = scraper.user_id
        ig_session.device_settings = scraper.get_device_settings()
        ig_session.is_valid = True
        ig_session.last_login = datetime.now(timezone.utc)
    else:
        ig_session = InstagramSession(
            user_id=user.id,
            ig_username=ig_username,
            ig_user_id=scraper.user_id,
            session_data=session_data,
            device_settings=scraper.get_device_settings(),
            is_valid=True,
        )
        db.add(ig_session)

    await db.flush()
    await db.refresh(ig_session)

    return BrowserLoginResponse(
        status="login_success",
        ig_username=ig_username,
        message=f"Successfully connected @{ig_username} with full browser cookies",
    )


@router.get("/instagram/session", response_model=InstagramSessionRead | None)
async def get_instagram_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current Instagram session status."""
    result = await db.execute(
        select(InstagramSession).where(
            InstagramSession.user_id == user.id,
            InstagramSession.is_valid == True,
        )
    )
    return result.scalar_one_or_none()


@router.delete("/instagram/session", status_code=204)
async def disconnect_instagram_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect (invalidate) the current Instagram session."""
    result = await db.execute(
        select(InstagramSession).where(InstagramSession.user_id == user.id)
    )
    sessions = result.scalars().all()
    for session in sessions:
        session.is_valid = False
        session.session_data = {}
    await db.flush()


@router.post("/instagram/renew", response_model=BrowserLoginResponse)
async def renew_instagram_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Re-launch the browser login flow to refresh expired Instagram cookies.
    Same as browser-login but ensures old session data is cleared first.
    """
    import asyncio
    from app.scraper.browser_login import browser_login
    from app.scraper.instagram import InstagramScraper

    try:
        from starlette.concurrency import run_in_threadpool

        def run_browser_sync():
            import asyncio
            import sys
            if sys.platform == "win32":
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            return asyncio.run(browser_login(timeout_ms=300_000))

        login_result = await run_in_threadpool(run_browser_sync)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Browser login failed: {e}")

    cookies = login_result["cookies"]
    ig_username = login_result.get("ig_username", "unknown")
    user_agent = login_result.get("user_agent", "")

    scraper = InstagramScraper(
        username=ig_username,
        web_cookies=cookies,
        web_user_agent=user_agent,
    )
    session_data = scraper.login()

    # Upsert session
    result = await db.execute(
        select(InstagramSession).where(InstagramSession.user_id == user.id)
    )
    ig_session = result.scalar_one_or_none()

    if ig_session:
        ig_session.session_data = session_data
        ig_session.ig_username = ig_username
        ig_session.ig_user_id = scraper.user_id
        ig_session.is_valid = True
        ig_session.last_login = datetime.now(timezone.utc)
    else:
        ig_session = InstagramSession(
            user_id=user.id,
            ig_username=ig_username,
            ig_user_id=scraper.user_id,
            session_data=session_data,
            is_valid=True,
        )
        db.add(ig_session)

    await db.flush()

    return BrowserLoginResponse(
        status="login_success",
        ig_username=ig_username,
        message=f"Session renewed successfully for @{ig_username}",
    )




@router.get("/stories", response_model=StoryListRead)
async def list_stories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    media_type: Optional[int] = Query(None, description="1=photo, 2=video"),
    has_music: Optional[bool] = None,
    has_location: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_reel: Optional[bool] = None,
    is_memory: Optional[bool] = None,
    is_trashed: Optional[bool] = False,
    search: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List archived stories with pagination and filtering.
    Supports filtering by media type, music, location, and date range.
    """
    query = (
        select(Story)
        .where(Story.user_id == user.id)
        .options(
            selectinload(Story.music),
            selectinload(Story.mentions),
            selectinload(Story.stickers),
            selectinload(Story.links),
            selectinload(Story.polls),
        )
        .order_by(Story.taken_at.desc())
    )

    # Apply filters
    if media_type is not None:
        query = query.where(Story.media_type == media_type)
    if has_location is True:
        query = query.where(Story.location_name.isnot(None))
    if date_from:
        query = query.where(Story.taken_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.where(Story.taken_at <= datetime.fromisoformat(date_to))
    if is_reel is not None:
        query = query.where(Story.is_reel == is_reel)
    if is_memory is not None:
        query = query.where(Story.is_memory == is_memory)
    if is_trashed is not None:
        query = query.where(Story.is_trashed == is_trashed)
        
    if search:
        from sqlalchemy import or_
        from app.models import StoryMusic
        search_term = f"%{search}%"
        # We need an outer join with StoryMusic to search by music title/artist if we aren't already joining
        query = query.outerjoin(StoryMusic, Story.id == StoryMusic.story_id).where(
            or_(
                Story.location_name.ilike(search_term),
                Story.caption_text.ilike(search_term),
                StoryMusic.track_title.ilike(search_term),
                StoryMusic.artist_name.ilike(search_term)
            )
        )

    # Count total
    count_query = select(func.count()).select_from(
        query.with_only_columns(Story.id).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    stories = result.scalars().all()

    # Generate pre-signed URLs for media access
    storage = get_storage()
    story_reads = []
    for story in stories:
        sr = StoryRead.model_validate(story)
        if story.s3_key_compressed:
            sr.media_url = storage.get_presigned_url(story.s3_key_compressed)
        if story.og_reel_s3_key:
            sr.og_reel_url = storage.get_presigned_url(story.og_reel_s3_key)
        story_reads.append(sr)

    return StoryListRead(
        stories=story_reads,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.get("/stories/{story_id}", response_model=StoryRead)
async def get_story(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single story with all its metadata."""
    result = await db.execute(
        select(Story)
        .where(Story.id == story_id, Story.user_id == user.id)
        .options(
            selectinload(Story.music),
            selectinload(Story.mentions),
            selectinload(Story.stickers),
            selectinload(Story.links),
            selectinload(Story.polls),
        )
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    sr = StoryRead.model_validate(story)
    storage = get_storage()
    if story.s3_key_compressed:
        sr.media_url = storage.get_presigned_url(story.s3_key_compressed, expires_in=7200)
    if story.og_reel_s3_key:
        sr.og_reel_url = storage.get_presigned_url(story.og_reel_s3_key, expires_in=7200)
    return sr


@router.patch("/stories/bulk", response_model=dict)
async def bulk_update_stories(
    body: StoryBulkUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk update fields (like is_trashed) for multiple stories."""
    query = select(Story).where(Story.id.in_(body.story_ids), Story.user_id == user.id)
    result = await db.execute(query)
    stories = result.scalars().all()

    if not stories:
        raise HTTPException(status_code=404, detail="No stories found or permission denied")

    updates = body.model_dump(exclude_unset=True, exclude={"story_ids"})
    
    for story in stories:
        for key, value in updates.items():
            setattr(story, key, value)

    await db.commit()
    return {"status": "ok", "updated_count": len(stories)}

@router.patch("/stories/{story_id}", response_model=StoryRead)
async def update_story(
    story_id: uuid.UUID,
    update_data: StoryUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update story fields (like is_memory, is_reel, primary_view)."""
    result = await db.execute(
        select(Story)
        .where(Story.id == story_id, Story.user_id == user.id)
        .options(
            selectinload(Story.music),
            selectinload(Story.mentions),
            selectinload(Story.stickers),
            selectinload(Story.links),
            selectinload(Story.polls),
        )
    )
    story = result.scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(story, key, value)
        
    await db.commit()
    await db.refresh(story)
    
    storage = get_storage()
    
    # Write journal_note to a sidecar .md file if provided
    if "journal_note" in update_dict and story.s3_key_compressed:
        note_content = update_dict["journal_note"] or ""
        # e.g., stories/2026-07/filename.mp4 -> stories/2026-07/filename.md
        md_key = story.s3_key_compressed.rsplit(".", 1)[0] + ".md"
        storage.upload_bytes(
            data=note_content.encode("utf-8"),
            s3_key=md_key,
            content_type="text/markdown"
        )
        
        # Also inject into the EXIF metadata of the local file so it is natively viewable in iOS/Android galleries
        from app.config import get_settings
        from app.scraper.metadata import MetadataWriter
        from pathlib import Path
        settings = get_settings()
        
        if settings.storage_type == "local":
            file_path = Path(settings.storage_local_dir).resolve() / story.s3_key_compressed
            if file_path.exists():
                story_data = {
                    "ig_media_id": story.ig_media_id,
                    "media_type": story.media_type,
                    "taken_at": story.taken_at,
                    "caption_text": story.caption_text,
                    "journal_note": story.journal_note,
                    "location_name": story.location_name,
                    "location_lat": story.location_lat,
                    "location_lng": story.location_lng,
                    "viewer_count": story.viewer_count,
                    "like_count": story.like_count,
                    "music": {"track_title": story.music.track_title, "artist_name": story.music.artist_name} if story.music else None,
                    "mentions": [{"username": m.username} for m in story.mentions] if story.mentions else []
                }
                # Run exiftool in the background so we don't block the API response too long
                import asyncio
                asyncio.create_task(asyncio.to_thread(MetadataWriter.write_metadata, file_path, story_data))
    
    sr = StoryRead.model_validate(story)
    if story.s3_key_compressed:
        sr.media_url = storage.get_presigned_url(story.s3_key_compressed, expires_in=7200)
    if story.og_reel_s3_key:
        sr.og_reel_url = storage.get_presigned_url(story.og_reel_s3_key, expires_in=7200)
    return sr


@router.get("/stories/locations/all", response_model=list[StoryLocationRead])
async def get_all_story_locations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all stories with valid GPS coordinates for map plotting.
    Highly optimized endpoint without heavy relations.
    """
    query = (
        select(Story)
        .where(
            Story.user_id == user.id,
            Story.location_lat.isnot(None),
            Story.location_lng.isnot(None)
        )
        .order_by(Story.taken_at.desc())
    )
    result = await db.execute(query)
    stories = result.scalars().all()

    storage = get_storage()
    locations = []
    for story in stories:
        sr = StoryLocationRead.model_validate(story)
        if story.s3_key_compressed:
            sr.media_url = storage.get_presigned_url(story.s3_key_compressed, expires_in=7200)
        locations.append(sr)

    return locations


@router.get("/stories/{story_id}/viewers")
async def get_story_viewers(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the list of viewers for a specific story."""
    from app.models import StoryViewer

    result = await db.execute(
        select(Story).where(Story.id == story_id, Story.user_id == user.id)
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    viewers_result = await db.execute(
        select(StoryViewer).where(StoryViewer.story_id == story_id)
    )
    return viewers_result.scalars().all()


@router.get("/stories/{story_id}/manifest")
async def get_story_manifest(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the raw .mem manifest JSON for a story."""
    result = await db.execute(
        select(Story).where(Story.id == story_id, Story.user_id == user.id)
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    return story.manifest or {}


@router.get("/stories/{story_id}/adjacent", response_model=AdjacentStoriesRead)
async def get_adjacent_stories(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the chronologically previous (older) and next (newer) story IDs."""
    # First get the current story's taken_at
    result = await db.execute(
        select(Story.taken_at).where(Story.id == story_id, Story.user_id == user.id)
    )
    taken_at = result.scalar_one_or_none()
    if not taken_at:
        raise HTTPException(status_code=404, detail="Story not found")

    # Prev story (older) -> max taken_at that is < current taken_at
    prev_result = await db.execute(
        select(Story.id)
        .where(Story.user_id == user.id, Story.taken_at < taken_at)
        .order_by(Story.taken_at.desc())
        .limit(1)
    )
    prev_id = prev_result.scalar_one_or_none()

    # Next story (newer) -> min taken_at that is > current taken_at
    next_result = await db.execute(
        select(Story.id)
        .where(Story.user_id == user.id, Story.taken_at > taken_at)
        .order_by(Story.taken_at.asc())
        .limit(1)
    )
    next_id = next_result.scalar_one_or_none()

    return AdjacentStoriesRead(prev_id=prev_id, next_id=next_id)



@router.put("/stories/{story_id}/toggle-reel")
async def toggle_story_reel(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually toggle a story between Timeline and Reels tab."""
    result = await db.execute(
        select(Story).where(Story.id == story_id, Story.user_id == user.id)
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    story.is_reel = not story.is_reel
    await db.commit()
    return {"status": "success", "is_reel": story.is_reel}


@router.post("/stories/rescan-metadata")
async def rescan_story_metadata(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rescan all raw_api_response JSON in the DB and update is_reel and stickers.
    This avoids re-scraping from Instagram.
    """
    from app.scraper.instagram import InstagramScraper
    scraper = InstagramScraper()

    result = await db.execute(select(Story).where(Story.user_id == user.id))
    stories = result.scalars().all()

    updated_count = 0
    for story in stories:
        if story.raw_api_response:
            try:
                # Re-parse the raw JSON using our updated scraper logic
                parsed = scraper._parse_raw_story_dict(story.raw_api_response)
                
                # Update specific fields
                story.is_reel = parsed.get("is_reel", False)
                story.manifest = parsed.get("manifest", {})
                
                # We could theoretically update stickers/mentions here too, 
                # but they are relationships so it requires deleting and recreating them.
                # For this feature, just updating `is_reel` and `manifest` is sufficient.
                
                updated_count += 1
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to rescan story {story.id}: {e}")

    await db.commit()
    return {"status": "success", "updated_count": updated_count}


# ═══════════════════════════════════════════════════════════
# Scraping Endpoints
# ═══════════════════════════════════════════════════════════

from fastapi import BackgroundTasks
from app.schemas import HighlightResponse

@router.get("/highlights", response_model=list[HighlightResponse])
async def get_highlights(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all highlights for the current user."""
    from sqlalchemy import select
    from app.models import Highlight, HighlightStoryLink, Story
    result = await db.execute(
        select(Highlight)
        .where(Highlight.user_id == user.id)
        .order_by(Highlight.created_at.desc())
    )
    highlights = result.scalars().all()
    
    from app.storage.s3 import get_storage
    storage = get_storage()
    highlight_responses = []
    
    for h in highlights:
        hr = HighlightResponse.model_validate(h)
        # Check if cover_media_url starts with /api/v1/media for local custom uploads
        if h.cover_media_url and not h.cover_media_url.startswith('http') and not h.cover_media_url.startswith('/api/v1/media'):
            hr.cover_media_url = storage.get_presigned_url(h.cover_media_url)
            
        story_res = await db.execute(
            select(Story.s3_key_compressed, Story.cdn_url)
            .join(HighlightStoryLink, Story.id == HighlightStoryLink.story_id)
            .where(HighlightStoryLink.highlight_id == h.id)
            .order_by(Story.taken_at.desc())
            .limit(4)
        )
        stories = story_res.all()
        preview_urls = []
        for s in stories:
            if s.s3_key_compressed:
                preview_urls.append(storage.get_presigned_url(s.s3_key_compressed))
            else:
                preview_urls.append(s.cdn_url)
        hr.preview_stories = preview_urls
            
        highlight_responses.append(hr)
        
    return highlight_responses

@router.get("/highlights/{highlight_id}/stories", response_model=list[StoryRead])
async def get_highlight_stories(
    highlight_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all stories for a specific highlight."""
    from sqlalchemy import select
    from app.models import Story, HighlightStoryLink
    result = await db.execute(
        select(Story)
        .join(HighlightStoryLink, Story.id == HighlightStoryLink.story_id)
        .where(HighlightStoryLink.highlight_id == highlight_id)
        .where(Story.user_id == user.id)
        .options(
            selectinload(Story.music),
            selectinload(Story.mentions),
            selectinload(Story.stickers),
            selectinload(Story.links),
            selectinload(Story.polls),
        )
        .order_by(Story.taken_at.asc())
    )
    stories = result.scalars().all()
    
    from app.storage.s3 import get_storage
    storage = get_storage()
    story_reads = []
    for story in stories:
        sr = StoryRead.model_validate(story)
        if story.s3_key_compressed:
            sr.media_url = storage.get_presigned_url(story.s3_key_compressed)
        if story.og_reel_s3_key:
            sr.og_reel_url = storage.get_presigned_url(story.og_reel_s3_key)
        story_reads.append(sr)
        
    return story_reads


@router.post("/scrape/now", response_model=ScrapeLogRead)
async def trigger_scrape(
    background_tasks: BackgroundTasks,
    body: ScrapeRequest = ScrapeRequest(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger an immediate story scrape."""
    from app.scraper.tasks import poll_stories

    log = ScrapeLog(user_id=user.id, status="running")
    db.add(log)
    await db.flush()

    # Dispatch Celery task in background to avoid blocking the HTTP response
    background_tasks.add_task(poll_stories.delay, str(user.id))

    await db.refresh(log)
    return log


@router.post("/scrape/archive")
async def trigger_archive_import(
    background_tasks: BackgroundTasks,
    body: ArchiveImportRequest = ArchiveImportRequest(),
    user: User = Depends(get_current_user),
):
    """
    Trigger a full historical archive import.
    This fetches ALL past stories from your Instagram archive.
    """
    from app.scraper.tasks import import_archive

    background_tasks.add_task(import_archive.delay, str(user.id), body.max_stories)
    return {"status": "started", "max_stories": body.max_stories}

@router.post("/scrape/highlights")
async def trigger_highlights_sync(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """Trigger a sync of user's highlights."""
    from app.scraper.tasks import sync_highlights
    background_tasks.add_task(sync_highlights.delay, str(user.id))
    return {"status": "started"}




@router.get("/scrape/logs", response_model=list[ScrapeLogRead])
async def get_scrape_logs(
    limit: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get recent scrape job logs."""
    result = await db.execute(
        select(ScrapeLog)
        .where(ScrapeLog.user_id == user.id)
        .order_by(ScrapeLog.started_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


# ═══════════════════════════════════════════════════════════
# Dashboard Endpoints
# ═══════════════════════════════════════════════════════════

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate statistics for the dashboard."""
    # Total stories
    total_result = await db.execute(
        select(func.count()).select_from(Story).where(Story.user_id == user.id)
    )
    total_stories = total_result.scalar() or 0

    # Photos vs Videos
    photos_result = await db.execute(
        select(func.count())
        .select_from(Story)
        .where(Story.user_id == user.id, Story.media_type == 1)
    )
    total_photos = photos_result.scalar() or 0
    total_videos = total_stories - total_photos

    # Stories with music
    music_result = await db.execute(
        select(func.count())
        .select_from(StoryMusic)
        .join(Story)
        .where(Story.user_id == user.id)
    )
    total_with_music = music_result.scalar() or 0

    # Stories with location
    location_result = await db.execute(
        select(func.count())
        .select_from(Story)
        .where(Story.user_id == user.id, Story.location_name.isnot(None))
    )
    total_with_location = location_result.scalar() or 0

    # Total mentions
    from app.models import StoryMention

    mentions_result = await db.execute(
        select(func.count())
        .select_from(StoryMention)
        .join(Story)
        .where(Story.user_id == user.id)
    )
    total_mentions = mentions_result.scalar() or 0

    # Storage used
    try:
        storage = get_storage()
        storage_used_mb = storage.get_total_size_mb()
    except Exception:
        storage_used_mb = 0.0

    # Last scrape
    last_scrape_result = await db.execute(
        select(ScrapeLog)
        .where(ScrapeLog.user_id == user.id)
        .order_by(ScrapeLog.started_at.desc())
        .limit(1)
    )
    last_scrape = last_scrape_result.scalar_one_or_none()

    # IG session validity
    ig_result = await db.execute(
        select(InstagramSession).where(
            InstagramSession.user_id == user.id,
            InstagramSession.is_valid == True,
        )
    )
    ig_session_valid = ig_result.scalar_one_or_none() is not None

    return DashboardStats(
        total_stories=total_stories,
        total_photos=total_photos,
        total_videos=total_videos,
        total_with_music=total_with_music,
        total_with_location=total_with_location,
        total_mentions=total_mentions,
        storage_used_mb=storage_used_mb,
        last_scrape=ScrapeLogRead.model_validate(last_scrape) if last_scrape else None,
        ig_session_valid=ig_session_valid,
    )


from pydantic import BaseModel
class LocateRequest(BaseModel):
    story_id: uuid.UUID

@router.post("/media/locate")
async def locate_local_media(
    body: LocateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Locate the media file in the native OS File Explorer."""
    import subprocess
    import sys
    from app.config import get_settings
    
    result = await db.execute(
        select(Story).where(Story.id == body.story_id, Story.user_id == user.id)
    )
    story = result.scalar_one_or_none()
    
    if not story or not story.s3_key_compressed:
        raise HTTPException(status_code=404, detail="Story media not found")
        
    settings = get_settings()
    if settings.storage_type != "local":
        raise HTTPException(status_code=400, detail="Locate only works with local storage")
        
    file_path = Path(settings.storage_local_dir).resolve() / story.s3_key_compressed
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found on disk: {file_path}")
        
    try:
        if sys.platform == "win32":
            subprocess.Popen(f'explorer /select,"{file_path}"')
            return {"status": "success", "message": "File opened in Windows Explorer"}
        elif sys.platform == "darwin":
            subprocess.Popen(["open", "-R", str(file_path)])
            return {"status": "success", "message": "File opened in Finder"}
        else:
            raise HTTPException(status_code=400, detail="Locate feature not supported on this OS")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open file explorer: {str(e)}")

# ── Media serving for Local Storage fallback ─────────────
from fastapi.responses import FileResponse

@router.get("/media/{rest_of_path:path}")
async def serve_local_media(rest_of_path: str):
    """Serve media files locally if storage_type is set to 'local'."""
    from app.config import get_settings
    settings = get_settings()
    if settings.storage_type != "local":
        raise HTTPException(status_code=403, detail="Local storage is not enabled")
    
    file_path = Path(settings.storage_local_dir) / rest_of_path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path)


class LocationUpdateRequest(BaseModel):
    location_name: str
    location_lat: float
    location_lng: float

@router.put("/media/{story_id}/location")
async def update_story_location(
    story_id: uuid.UUID,
    body: LocationUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually update the location of a story and sync to EXIF."""
    from app.config import get_settings
    from app.scraper.metadata import MetadataWriter
    
    result = await db.execute(
        select(Story).where(Story.id == story_id, Story.user_id == user.id)
    )
    story = result.scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    # Update DB
    story.location_name = body.location_name
    story.location_lat = body.location_lat
    story.location_lng = body.location_lng
    
    await db.commit()
    await db.refresh(story)
    
    # Sync EXIF if file is local
    settings = get_settings()
    if settings.storage_type == "local" and story.s3_key_compressed:
        file_path = Path(settings.storage_local_dir).resolve() / story.s3_key_compressed
        if file_path.exists():
            # Create a mock dict resembling what MetadataWriter expects
            story_data = {
                "ig_media_id": story.ig_media_id,
                "media_type": story.media_type,
                "taken_at": story.taken_at,
                "caption_text": story.caption_text,
                "location_name": story.location_name,
                "location_lat": story.location_lat,
                "location_lng": story.location_lng,
                "viewer_count": story.viewer_count,
            }
            # Try to run exiftool
            MetadataWriter.write_metadata(file_path, story_data)

    return {"status": "success", "location_name": story.location_name}

from app.schemas import ManualHighlightCreate
@router.post('/highlights/manual', response_model=HighlightResponse)
async def create_manual_highlight(
    body: ManualHighlightCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models import Highlight, HighlightStoryLink, Story
    import uuid
    from datetime import datetime, timezone

    # Verify all stories exist and belong to user
    from sqlalchemy import select
    stories_res = await db.execute(
        select(Story).where(Story.id.in_(body.story_ids)).where(Story.user_id == user.id)
    )
    stories = stories_res.scalars().all()
    if len(stories) != len(body.story_ids):
        raise HTTPException(status_code=400, detail='Some stories not found or unauthorized')

    # Create Highlight
    new_h = Highlight(
        ig_highlight_id=f'manual_{uuid.uuid4().hex[:10]}',
        user_id=user.id,
        title=body.title,
        cover_media_url=stories[0].s3_key_compressed if stories else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_h)
    await db.flush()

    # Link Stories
    for s_id in body.story_ids:
        link = HighlightStoryLink(
            highlight_id=new_h.id,
            story_id=s_id,
            added_at=datetime.now(timezone.utc)
        )
        db.add(link)

    await db.commit()
    await db.refresh(new_h)
    
    from app.storage.s3 import get_storage
    storage = get_storage()
    hr = HighlightResponse.model_validate(new_h)
    if new_h.cover_media_url and not new_h.cover_media_url.startswith('http'):
        hr.cover_media_url = storage.get_presigned_url(new_h.cover_media_url)
        
    return hr

@router.delete('/highlights/{highlight_id}', status_code=204)
async def delete_highlight(
    highlight_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models import Highlight, HighlightStoryLink
    from sqlalchemy import select, delete

    # Fetch highlight to ensure it belongs to the user
    res = await db.execute(
        select(Highlight).where(Highlight.id == highlight_id).where(Highlight.user_id == user.id)
    )
    hl = res.scalar_one_or_none()
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found or unauthorized")

    # Delete links first
    await db.execute(delete(HighlightStoryLink).where(HighlightStoryLink.highlight_id == highlight_id))
    
    # Delete the highlight itself
    await db.execute(delete(Highlight).where(Highlight.id == highlight_id))
    
    await db.commit()
    return

from app.schemas import HighlightUpdate, HighlightStoriesUpdate
import os
import shutil

@router.post('/highlights/{highlight_id}/cover', response_model=HighlightResponse)
async def upload_highlight_cover(
    highlight_id: uuid.UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a custom cover image for a highlight."""
    from app.models import Highlight
    result = await db.execute(select(Highlight).where(Highlight.id == highlight_id).where(Highlight.user_id == user.id))
    hl = result.scalar_one_or_none()
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")

    # Ensure directory exists
    cover_dir = "data/media/covers"
    os.makedirs(cover_dir, exist_ok=True)
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    if not ext:
        ext = ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(cover_dir, filename)
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update highlight with local path URL format that main.py serves
    hl.cover_media_url = f"/api/v1/media/covers/{filename}"
    hl.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(hl)
    
    # Return response without preview stories (not needed for this specific update response)
    hr = HighlightResponse.model_validate(hl)
    return hr

@router.patch('/highlights/{highlight_id}', response_model=HighlightResponse)
async def update_highlight(
    highlight_id: uuid.UUID,
    body: HighlightUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models import Highlight
    from sqlalchemy import select
    res = await db.execute(select(Highlight).where(Highlight.id == highlight_id).where(Highlight.user_id == user.id))
    hl = res.scalar_one_or_none()
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    hl.title = body.title
    await db.commit()
    await db.refresh(hl)
    
    from app.storage.s3 import get_storage
    storage = get_storage()
    hr = HighlightResponse.model_validate(hl)
    if hl.cover_media_url and not hl.cover_media_url.startswith('http'):
        hr.cover_media_url = storage.get_presigned_url(hl.cover_media_url)
    return hr

@router.post('/highlights/{highlight_id}/stories', status_code=200)
async def add_stories_to_highlight(
    highlight_id: uuid.UUID,
    body: HighlightStoriesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models import Highlight, HighlightStoryLink
    from sqlalchemy import select
    from datetime import datetime, timezone
    
    res = await db.execute(select(Highlight).where(Highlight.id == highlight_id).where(Highlight.user_id == user.id))
    hl = res.scalar_one_or_none()
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")
        
    # Check existing links to ignore duplicates
    existing_res = await db.execute(select(HighlightStoryLink.story_id).where(HighlightStoryLink.highlight_id == highlight_id))
    existing_ids = {row[0] for row in existing_res.all()}
    
    added_count = 0
    for s_id in body.story_ids:
        if s_id not in existing_ids:
            link = HighlightStoryLink(
                highlight_id=hl.id,
                story_id=s_id,
                added_at=datetime.now(timezone.utc)
            )
            db.add(link)
            added_count += 1
            
    if added_count > 0:
        await db.commit()
    return {"status": "success", "added_count": added_count}

@router.delete('/highlights/{highlight_id}/stories', status_code=200)
async def remove_stories_from_highlight(
    highlight_id: uuid.UUID,
    body: HighlightStoriesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models import Highlight, HighlightStoryLink
    from sqlalchemy import select, delete
    
    res = await db.execute(select(Highlight).where(Highlight.id == highlight_id).where(Highlight.user_id == user.id))
    hl = res.scalar_one_or_none()
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")
        
    await db.execute(
        delete(HighlightStoryLink)
        .where(HighlightStoryLink.highlight_id == highlight_id)
        .where(HighlightStoryLink.story_id.in_(body.story_ids))
    )
    await db.commit()
    return {"status": "success"}

@router.post('/stories/{story_id}/trash', response_model=StoryRead)
async def toggle_trash_story(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select
    from app.models import Story
    result = await db.execute(select(Story).where(Story.id == story_id, Story.user_id == user.id))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail='Story not found')
    
    story.is_trashed = not story.is_trashed
    await db.commit()
    await db.refresh(story)
    return story
