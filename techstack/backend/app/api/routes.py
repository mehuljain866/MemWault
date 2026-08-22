"""
MemWault REST API Routes
All endpoints for the PWA frontend to consume.
"""

import logging
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select, delete
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
    Post,
    PostMedia,
    QRUploadSession,
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
    PostRead,
    PostListRead,
    PostUpdate,
    PostMediaUpdate,
    PostMediaRead,
    QRUploadSessionRead,
)
from app.storage.s3 import get_storage

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger("memwault.api")


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
    from app.desktop import DesktopUnavailable
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
    except DesktopUnavailable as e:
        # Must be caught before RuntimeError - it is a subclass. 501 means the
        # request was fine but this deployment has no desktop to show a window on.
        logger.warning("Browser login unavailable: %s", e)
        raise HTTPException(status_code=501, detail=str(e))
    except RuntimeError as e:
        logger.warning("Browser login failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Browser login crashed")
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
    """Get the current Instagram session status and enriched profile info."""
    result = await db.execute(
        select(InstagramSession)
        .where(
            InstagramSession.user_id == user.id,
            InstagramSession.is_valid == True,
        )
        .order_by(InstagramSession.last_login.desc())
        .limit(1)
    )
    sess = result.scalars().first()
    if not sess:
        return None

    # Check if profile data is cached in session_data or fetch it
    profile_data = (sess.session_data or {}).get("profile", {})
    if not profile_data or (sess.ig_username and sess.ig_username.isdigit()):
        try:
            from app.scraper.instagram import InstagramScraper
            scraper = InstagramScraper(
                username=sess.ig_username,
                session_data=sess.session_data,
                device_settings=sess.device_settings,
            )
            prof = scraper.fetch_user_profile()
            if prof:
                if prof.get("username") and sess.ig_username.isdigit():
                    sess.ig_username = prof["username"]
                profile_data = prof
                sess.session_data = {**(sess.session_data or {}), "profile": profile_data}
                await db.flush()
        except Exception as e:
            logger.warning("Could not refresh profile data: %s", e)

    return InstagramSessionRead(
        id=sess.id,
        ig_username=sess.ig_username,
        ig_user_id=sess.ig_user_id,
        full_name=profile_data.get("full_name"),
        profile_pic_url=profile_data.get("profile_pic_url"),
        biography=profile_data.get("biography"),
        follower_count=profile_data.get("follower_count"),
        following_count=profile_data.get("following_count"),
        media_count=profile_data.get("media_count"),
        is_valid=sess.is_valid,
        last_login=sess.last_login,
    )


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
    from app.desktop import DesktopUnavailable
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
    except DesktopUnavailable as e:
        # Must be caught before RuntimeError - it is a subclass. 501 means the
        # request was fine but this deployment has no desktop to show a window on.
        logger.warning("Browser login unavailable: %s", e)
        raise HTTPException(status_code=501, detail=str(e))
    except RuntimeError as e:
        logger.warning("Browser login failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Browser login crashed")
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

    # Upsert session. This query is unfiltered, so any user who has ever
    # connected a second account would hit MultipleResultsFound here - take the
    # most recently used row instead.
    result = await db.execute(
        select(InstagramSession)
        .where(InstagramSession.user_id == user.id)
        .order_by(InstagramSession.last_login.desc())
        .limit(1)
    )
    ig_session = result.scalars().first()

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
    is_close_friends: Optional[bool] = None,
    search: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List archived stories with pagination and filtering.
    Supports filtering by media type, music, location, date range, and Close Friends.
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
    if is_reel is True:
        from sqlalchemy import or_
        query = query.where(or_(Story.is_reel == True, Story.media_type == 2))
    elif is_reel is False:
        query = query.where(Story.is_reel == False, Story.media_type != 2)
    if is_memory is not None:
        query = query.where(Story.is_memory == is_memory)
    if is_trashed is not None:
        query = query.where(Story.is_trashed == is_trashed)
    if is_close_friends is not None:
        query = query.where(Story.is_close_friends == is_close_friends)
        
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
            sr.thumbnail_url = storage.get_presigned_url(story.s3_key_compressed)
            sr.s3_key_compressed = story.s3_key_compressed
        elif story.cdn_url:
            sr.media_url = story.cdn_url
            sr.thumbnail_url = story.cdn_url
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
        sr.thumbnail_url = storage.get_presigned_url(story.s3_key_compressed, expires_in=7200)
        sr.s3_key_compressed = story.s3_key_compressed
    elif story.cdn_url:
        sr.media_url = story.cdn_url
        sr.thumbnail_url = story.cdn_url
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
        select(StoryViewer)
        .where(StoryViewer.story_id == story_id)
        .order_by(StoryViewer.has_liked.desc(), StoryViewer.view_count.desc(), StoryViewer.viewed_at.desc())
    )
    return viewers_result.scalars().all()


@router.post("/stories/{story_id}/refresh-viewers")
async def refresh_story_viewers(
    story_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the latest live viewers and reactions for an active story from Instagram."""
    from app.models import StoryViewer, InstagramSession
    from app.scraper.instagram import InstagramScraper

    result = await db.execute(
        select(Story).where(Story.id == story_id, Story.user_id == user.id)
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    # Get user's active session
    session_res = await db.execute(
        select(InstagramSession).where(InstagramSession.user_id == user.id, InstagramSession.is_valid == True).limit(1)
    )
    ig_session = session_res.scalars().first()
    if not ig_session or not ig_session.session_data:
        raise HTTPException(status_code=400, detail="No active Instagram session connected.")

    scraper = InstagramScraper(username=ig_session.ig_username, session_data=ig_session.session_data)
    scraper.login()
    viewers_list = scraper.fetch_story_viewers(story.ig_media_id)

    # Delete old and insert authentic fresh viewers from Instagram
    await db.execute(delete(StoryViewer).where(StoryViewer.story_id == story_id))
    for v in viewers_list:
        sv = StoryViewer(
            story_id=story_id,
            ig_user_id=v["ig_user_id"],
            username=v["username"],
            full_name=v.get("full_name"),
            profile_pic_url=v.get("profile_pic_url"),
            has_liked=v.get("has_liked", False),
            reaction_emoji=v.get("reaction_emoji"),
            view_count=v.get("view_count", 1),
        )
        db.add(sv)

    story.viewer_count = len(viewers_list)
    story.like_count = sum(1 for v in viewers_list if v.get("has_liked"))
    await db.commit()

    return {
        "status": "ok",
        "viewer_count": story.viewer_count,
        "like_count": story.like_count,
        "viewers": viewers_list
    }


@router.get("/proxy/image")
async def proxy_image(url: str = Query(...)):
    """Proxy image requests to bypass Instagram CDN referrer/CORS restrictions."""
    import httpx
    from fastapi import Response
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            })
            if resp.status_code == 200:
                return Response(content=resp.content, media_type=resp.headers.get("content-type", "image/jpeg"))
        except Exception:
            pass
    raise HTTPException(status_code=404, detail="Image could not be retrieved")


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
    location_name: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the chronologically previous (older) and next (newer) story IDs, optionally filtered by location."""
    # First get the current story's taken_at
    result = await db.execute(
        select(Story.taken_at).where(Story.id == story_id, Story.user_id == user.id)
    )
    taken_at = result.scalar_one_or_none()
    if not taken_at:
        raise HTTPException(status_code=404, detail="Story not found")

    # Prev story (older) -> max taken_at that is < current taken_at
    prev_query = select(Story.id).where(Story.user_id == user.id, Story.taken_at < taken_at)
    if location_name:
        prev_query = prev_query.where(Story.location_name.ilike(f"%{location_name}%"))
    prev_result = await db.execute(
        prev_query.order_by(Story.taken_at.desc()).limit(1)
    )
    prev_id = prev_result.scalar_one_or_none()

    # Next story (newer) -> min taken_at that is > current taken_at
    next_query = select(Story.id).where(Story.user_id == user.id, Story.taken_at > taken_at)
    if location_name:
        next_query = next_query.where(Story.location_name.ilike(f"%{location_name}%"))
    next_result = await db.execute(
        next_query.order_by(Story.taken_at.asc()).limit(1)
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
            hr.cover_thumbnail_url = hr.cover_media_url
        else:
            hr.cover_thumbnail_url = hr.cover_media_url
            
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
        hr.preview_thumbnails = preview_urls
            
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

    # Total Close Friends stories
    cf_result = await db.execute(
        select(func.count())
        .select_from(Story)
        .where(Story.user_id == user.id, Story.is_close_friends == True, Story.is_trashed == False)
    )
    total_close_friends = cf_result.scalar() or 0

    # Total Feed Posts
    posts_result = await db.execute(
        select(func.count())
        .select_from(Post)
        .where(Post.user_id == user.id, Post.is_trashed == False)
    )
    total_feed_posts = posts_result.scalar() or 0

    # Total RAW / Lossless Master media preserved
    raw_result = await db.execute(
        select(func.count())
        .select_from(PostMedia)
        .join(Post)
        .where(Post.user_id == user.id, PostMedia.has_raw_master == True)
    )
    total_with_raw_master = raw_result.scalar() or 0

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
        select(InstagramSession)
        .where(
            InstagramSession.user_id == user.id,
            InstagramSession.is_valid == True,
        )
        .limit(1)
    )
    # .limit(1) matters: with two connected accounts scalar_one_or_none() would
    # raise MultipleResultsFound and 500 the whole dashboard.
    ig_session_valid = ig_result.scalars().first() is not None

    return DashboardStats(
        total_stories=total_stories,
        total_photos=total_photos,
        total_videos=total_videos,
        total_with_music=total_with_music,
        total_with_location=total_with_location,
        total_mentions=total_mentions,
        total_close_friends=total_close_friends,
        total_feed_posts=total_feed_posts,
        total_with_raw_master=total_with_raw_master,
        storage_used_mb=storage_used_mb,
        last_scrape=ScrapeLogRead.model_validate(last_scrape) if last_scrape else None,
        ig_session_valid=ig_session_valid,
    )


from pydantic import BaseModel
class LocateRequest(BaseModel):
    story_id: uuid.UUID

@router.post("/stories/locate")
async def locate_local_media(
    body: LocateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Locate the media file in the native OS File Explorer."""
    from pathlib import Path

    from app.config import get_settings
    from app.desktop import DesktopUnavailable, reveal_file

    result = await db.execute(
        select(Story).where(Story.id == body.story_id, Story.user_id == user.id)
    )
    story = result.scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    s3_key = story.s3_key_compressed or story.s3_key_original or story.og_reel_s3_key
    if not s3_key:
        raise HTTPException(status_code=404, detail="Story media key not found")
        
    settings = get_settings()
    if settings.storage_type != "local":
        raise HTTPException(status_code=400, detail="Locate only works with local storage")
        
    file_path = Path(settings.storage_local_dir).resolve() / s3_key
    
    if not file_path.exists():
        alt_key = story.s3_key_original or story.s3_key_compressed
        if alt_key:
            alt_path = Path(settings.storage_local_dir).resolve() / alt_key
            if alt_path.exists():
                file_path = alt_path
        
    try:
        message = reveal_file(file_path)
    except DesktopUnavailable as exc:
        # 501 Not Implemented: the request itself is fine, but this deployment
        # has no desktop to open a window on (e.g. the backend runs in Docker).
        logger.warning("Cannot reveal media file: %s", exc)
        raise HTTPException(status_code=501, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to reveal media file %s", file_path)
        raise HTTPException(status_code=500, detail=f"Failed to open file explorer: {exc}")

    return {"status": "success", "message": message}


@router.post("/storage/open-folder")
async def open_storage_folder(
    user: User = Depends(get_current_user),
):
    """Open the main local storage media folder in native File Explorer."""
    from pathlib import Path

    from app.config import get_settings
    from app.desktop import DesktopUnavailable, open_folder

    settings = get_settings()
    if settings.storage_type != "local":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Media is kept in '{settings.storage_type}' object storage rather than "
                f"on this machine's disk, so there is no local folder to open."
            ),
        )

    folder_path = Path(settings.storage_local_dir).resolve()

    try:
        message = open_folder(folder_path)
    except DesktopUnavailable as exc:
        logger.warning("Cannot open storage folder: %s", exc)
        raise HTTPException(status_code=501, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to open storage folder %s", folder_path)
        raise HTTPException(status_code=500, detail=f"Failed to open storage folder: {exc}")

    # The resolved path is returned so the UI can show *which* folder opened -
    # it is relative to the backend's working directory, which surprises people.
    return {"status": "success", "message": message, "path": str(folder_path)}

# ── Media serving for Local Storage fallback ─────────────
from fastapi.responses import FileResponse

@router.get("/media/{rest_of_path:path}")
async def serve_local_media(rest_of_path: str):
    """Serve media files locally if storage_type is set to 'local'."""
    from app.config import get_settings
    settings = get_settings()
    if settings.storage_type != "local":
        raise HTTPException(status_code=403, detail="Local storage is not enabled")

    # This endpoint is deliberately unauthenticated - browsers do not send the
    # Authorization header for <img src>/<video src>. That makes path containment
    # essential: without it, "../../.." in the URL would read any file on disk,
    # including memwault.db and the .env holding the JWT secret.
    base = Path(settings.storage_local_dir).resolve()
    file_path = (base / rest_of_path).resolve()
    if not file_path.is_relative_to(base):
        logger.warning("Blocked path traversal attempt: %r", rest_of_path)
        raise HTTPException(status_code=404, detail="File not found")

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

    # Covers must live under the configured media directory, because that is
    # what GET /media/{path} serves from. Hardcoding "data/media" here broke
    # covers for anyone who set MEMWAULT_STORAGE_LOCAL_DIR to another path.
    from app.config import get_settings

    cover_dir = Path(get_settings().storage_local_dir).resolve() / "covers"
    cover_dir.mkdir(parents=True, exist_ok=True)

    # Take the extension from an allowlist rather than from the upload. The
    # cover is later served back from our own origin, so accepting an arbitrary
    # extension (.html, .svg) would allow storing a script that runs as us.
    ALLOWED_COVER_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_COVER_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Cover must be one of: {', '.join(sorted(ALLOWED_COVER_EXTS))}",
        )
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = cover_dir / filename

    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Served by GET /api/v1/media/{path}, relative to storage_local_dir.
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


# ═══════════════════════════════════════════════════════════
# Posts, Carousels, Lossless RAW Media & QR Upload API
# ═══════════════════════════════════════════════════════════

def get_local_lan_ip() -> str:
    import socket
    # Method 1: Connect to public DNS to find default outgoing LAN IP
    for target in [("8.8.8.8", 80), ("1.1.1.1", 80), ("192.168.1.1", 80)]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.5)
            s.connect(target)
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith("127."):
                return ip
        except Exception:
            pass

    # Method 2: Hostname resolution fallback
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
    except Exception:
        pass

    return "127.0.0.1"


def _format_post_media(media: PostMedia, s3) -> dict:
    """Helper to attach pre-signed / direct URLs to PostMedia."""
    ig_url = None
    if media.s3_key_instagram:
        ig_url = s3.get_presigned_url(media.s3_key_instagram, expires_in=86400)
    elif media.instagram_cdn_url:
        ig_url = media.instagram_cdn_url

    raw_url = None
    if media.s3_key_raw_master:
        raw_url = s3.get_presigned_url(media.s3_key_raw_master, expires_in=86400)

    live_vid_url = None
    if media.s3_key_live_video:
        live_vid_url = s3.get_presigned_url(media.s3_key_live_video, expires_in=86400)

    media_url = raw_url or ig_url

    return {
        "id": media.id,
        "post_id": media.post_id,
        "slide_index": media.slide_index,
        "media_type": media.media_type,
        "media_url": media_url,
        "display_url": media_url,
        "thumbnail_url": ig_url or raw_url,
        "s3_key_instagram": media.s3_key_instagram,
        "instagram_media_url": ig_url,
        "instagram_width": media.instagram_width,
        "instagram_height": media.instagram_height,
        "s3_key_raw_master": media.s3_key_raw_master,
        "raw_media_url": raw_url,
        "raw_file_name": media.raw_file_name,
        "raw_width": media.raw_width,
        "raw_height": media.raw_height,
        "raw_file_size": media.raw_file_size,
        "raw_mime_type": media.raw_mime_type,
        "has_raw_master": media.has_raw_master,
        "is_live_photo": media.is_live_photo,
        "s3_key_live_video": media.s3_key_live_video,
        "live_video_url": live_vid_url,
        "live_video_duration_ms": media.live_video_duration_ms,
        "default_version": media.default_version or "raw",
        "crop_data": media.crop_data,
        "duration_ms": media.duration_ms,
        "created_at": media.created_at,
    }


def _format_post(post: Post, s3) -> dict:
    """Format Post object with media items."""
    media_list = [_format_post_media(m, s3) for m in sorted(post.media_items, key=lambda x: x.slide_index)]
    return {
        "id": post.id,
        "user_id": post.user_id,
        "ig_media_id": post.ig_media_id,
        "ig_shortcode": post.ig_shortcode,
        "ig_media_pk": post.ig_media_pk,
        "taken_at": post.taken_at,
        "archived_at": post.archived_at,
        "media_type": post.media_type,
        "aspect_ratio": post.aspect_ratio or 1.0,
        "is_pinned": post.is_pinned,
        "is_favorite": post.is_favorite,
        "is_trashed": post.is_trashed,
        "caption_text": post.caption_text,
        "location_name": post.location_name,
        "location_lat": post.location_lat,
        "location_lng": post.location_lng,
        "location_id": post.location_id,
        "audio_title": post.audio_title,
        "audio_artist": post.audio_artist,
        "like_count": post.like_count or 0,
        "comment_count": post.comment_count or 0,
        "has_liked": post.has_liked,
        "journal_note": post.journal_note,
        "media_items": media_list,
    }


@router.get("/posts", response_model=PostListRead)
async def list_posts(
    media_type: Optional[int] = Query(None, description="1=photo, 2=video, 8=carousel"),
    is_favorite: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List archived Instagram feed posts & carousels."""
    s3 = get_storage()
    query = (
        select(Post)
        .options(selectinload(Post.media_items))
        .where(Post.user_id == user.id, Post.is_trashed == False)
        .order_by(Post.is_pinned.desc(), Post.taken_at.desc())
    )

    if media_type is not None:
        query = query.where(Post.media_type == media_type)
    if is_favorite is not None:
        query = query.where(Post.is_favorite == is_favorite)

    # Count total
    count_query = select(func.count(Post.id)).where(Post.user_id == user.id, Post.is_trashed == False)
    if media_type is not None:
        count_query = count_query.where(Post.media_type == media_type)
    if is_favorite is not None:
        count_query = count_query.where(Post.is_favorite == is_favorite)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    posts = result.scalars().all()

    formatted_posts = [_format_post(p, s3) for p in posts]

    return {
        "posts": formatted_posts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total,
    }


@router.get("/posts/{post_id}", response_model=PostRead)
async def get_post_detail(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single post with all carousel slides, dual versions, and metadata."""
    s3 = get_storage()
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.media_items))
        .where(Post.id == post_id, Post.user_id == user.id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return _format_post(post, s3)


@router.post("/posts/sync")
async def trigger_posts_sync(
    amount: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """Trigger background sync of Instagram feed posts and carousels."""
    from app.scraper.tasks import sync_user_feed_posts
    result = sync_user_feed_posts(user_id=str(user.id), amount=amount)
    return result


@router.patch("/posts/{post_id}", response_model=PostRead)
async def update_post(
    post_id: uuid.UUID,
    updates: PostUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update post caption, journal note, is_favorite, or grid aspect ratio."""
    s3 = get_storage()
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.media_items))
        .where(Post.id == post_id, Post.user_id == user.id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    update_dict = updates.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(post, k, v)

    await db.commit()
    await db.refresh(post)
    return _format_post(post, s3)


@router.patch("/posts/{post_id}/media/{media_id}", response_model=PostMediaRead)
async def update_post_media(
    post_id: uuid.UUID,
    media_id: uuid.UUID,
    updates: PostMediaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update slide default version ('raw' or 'instagram'), crop, or slide index."""
    s3 = get_storage()
    result = await db.execute(
        select(PostMedia)
        .join(Post, PostMedia.post_id == Post.id)
        .where(PostMedia.id == media_id, Post.id == post_id, Post.user_id == user.id)
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Post media slide not found")

    update_dict = updates.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(media, k, v)

    await db.commit()
    await db.refresh(media)
    return _format_post_media(media, s3)


@router.post("/posts/{post_id}/media/{media_id}/replace-raw")
async def replace_post_media_raw(
    post_id: uuid.UUID,
    media_id: uuid.UUID,
    file: UploadFile = File(...),
    companion_video: Optional[UploadFile] = File(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Replace a slide with its uncompressed 48MP RAW / Master file.
    Automatically detects Google/Samsung Motion Photos or pairs Apple Live Photo .mov video.
    """
    from app.media.motion_photo import extract_embedded_motion_video, extract_image_metadata
    s3 = get_storage()

    result = await db.execute(
        select(PostMedia)
        .join(Post, PostMedia.post_id == Post.id)
        .where(PostMedia.id == media_id, Post.id == post_id, Post.user_id == user.id)
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Post media slide not found")

    file_bytes = await file.read()
    ext = Path(file.filename or "file.jpg").suffix.lower() or ".jpg"
    raw_s3_key = f"posts/raw_masters/{post_id}_{media.slide_index}{ext}"
    
    # Upload Master RAW file
    s3.upload_bytes(file_bytes, raw_s3_key, content_type=file.content_type or "application/octet-stream")

    # Extract EXIF metadata
    img_meta = extract_image_metadata(file_bytes)

    media.s3_key_raw_master = raw_s3_key
    media.raw_file_name = file.filename
    media.raw_file_size = len(file_bytes)
    media.raw_mime_type = file.content_type
    media.raw_width = img_meta.get("width")
    media.raw_height = img_meta.get("height")
    media.crop_data = img_meta
    media.has_raw_master = True
    media.default_version = "raw"

    # Check for Live / Motion Photo
    # 1. Companion video uploaded directly (Apple Live Photo)
    if companion_video:
        vid_bytes = await companion_video.read()
        live_key = f"posts/raw_masters/{post_id}_{media.slide_index}_live.mov"
        s3.upload_bytes(vid_bytes, live_key, content_type="video/quicktime")
        media.is_live_photo = True
        media.s3_key_live_video = live_key
    else:
        # 2. Extract embedded micro-video from motion photo (Google / Samsung)
        extracted_vid, mime = extract_embedded_motion_video(file_bytes)
        if extracted_vid:
            live_key = f"posts/raw_masters/{post_id}_{media.slide_index}_live.mp4"
            s3.upload_bytes(extracted_vid, live_key, content_type=mime or "video/mp4")
            media.is_live_photo = True
            media.s3_key_live_video = live_key

    await db.commit()
    await db.refresh(media)
    return _format_post_media(media, s3)


@router.post("/upload/qr-session", response_model=QRUploadSessionRead)
async def create_general_qr_upload_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a local Wi-Fi QR code session for uploading master files / wallpapers from phone camera roll.
    """
    import secrets
    from datetime import timedelta

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    
    session = QRUploadSession(
        user_id=user.id,
        post_id=None,
        token=token,
        expires_at=expires_at,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    lan_ip = get_local_lan_ip()
    qr_url = f"http://{lan_ip}:5173/upload-link/{token}"

    return {
        "id": session.id,
        "post_id": session.post_id,
        "token": session.token,
        "qr_url": qr_url,
        "expires_at": session.expires_at,
        "is_completed": session.is_completed,
        "uploaded_files": session.uploaded_files or [],
        "created_at": session.created_at,
    }


@router.post("/posts/{post_id}/qr-session", response_model=QRUploadSessionRead)
async def create_post_qr_upload_session(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a local Wi-Fi QR code session for uploading master files to a specific post.
    """
    import secrets
    from datetime import timedelta

    result = await db.execute(select(Post).where(Post.id == post_id, Post.user_id == user.id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    
    session = QRUploadSession(
        user_id=user.id,
        post_id=post_id,
        token=token,
        expires_at=expires_at,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    lan_ip = get_local_lan_ip()
    qr_url = f"http://{lan_ip}:5173/upload-link/{token}"

    return {
        "id": session.id,
        "post_id": session.post_id,
        "token": session.token,
        "qr_url": qr_url,
        "expires_at": session.expires_at,
        "is_completed": session.is_completed,
        "uploaded_files": session.uploaded_files or [],
        "created_at": session.created_at,
    }


@router.get("/upload-portal/{token}")
async def get_upload_portal_session(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public mobile endpoint accessed by scanning the QR code on local Wi-Fi.
    Returns post metadata and slide slots ready for upload.
    """
    s3 = get_storage()
    result = await db.execute(
        select(QRUploadSession)
        .options(selectinload(QRUploadSession.post).selectinload(Post.media_items))
        .where(QRUploadSession.token == token)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid QR upload session")

    exp = session.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="QR upload session has expired")

    post = session.post
    formatted_post = _format_post(post, s3) if post else None

    return {
        "session_id": session.id,
        "token": session.token,
        "is_general_transfer": post is None,
        "post": formatted_post,
        "expires_at": session.expires_at,
        "is_completed": session.is_completed,
        "uploaded_files": session.uploaded_files or [],
    }


@router.post("/upload-portal/{token}/upload")
async def upload_portal_files(
    token: str,
    slide_index: int = Query(0),
    file: UploadFile = File(...),
    companion_video: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Direct mobile LAN stream upload endpoint to attach uncompressed RAW / Live Photos / wallpapers from phone.
    """
    from app.media.motion_photo import extract_embedded_motion_video, extract_image_metadata
    s3 = get_storage()

    result = await db.execute(
        select(QRUploadSession)
        .options(selectinload(QRUploadSession.post).selectinload(Post.media_items))
        .where(QRUploadSession.token == token)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=400, detail="Invalid session")
    exp = session.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Expired session")

    file_bytes = await file.read()
    ext = Path(file.filename or "file.jpg").suffix.lower() or ".jpg"

    post = session.post
    if not post:
        # General file / wallpaper upload
        raw_s3_key = f"wallpapers/{session.token}_{file.filename}"
        s3.upload_bytes(file_bytes, raw_s3_key, content_type=file.content_type or "image/jpeg")
        file_url = s3.get_presigned_url(raw_s3_key)

        uploaded = list(session.uploaded_files or [])
        uploaded_item = {
            "filename": file.filename,
            "url": file_url,
            "slide_index": slide_index,
            "is_live_photo": False,
            "size_bytes": len(file_bytes),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
        uploaded.append(uploaded_item)
        session.uploaded_files = uploaded
        await db.commit()
        return {"status": "ok", "url": file_url, "uploaded_file": uploaded_item}

    media = next((m for m in post.media_items if m.slide_index == slide_index), None)
    if not media:
        raise HTTPException(status_code=404, detail=f"Slide index {slide_index} not found")

    raw_s3_key = f"posts/raw_masters/{post.id}_{slide_index}{ext}"
    s3.upload_bytes(file_bytes, raw_s3_key, content_type=file.content_type or "application/octet-stream")

    img_meta = extract_image_metadata(file_bytes)

    media.s3_key_raw_master = raw_s3_key
    media.raw_file_name = file.filename
    media.raw_file_size = len(file_bytes)
    media.raw_mime_type = file.content_type
    media.raw_width = img_meta.get("width")
    media.raw_height = img_meta.get("height")
    media.crop_data = img_meta
    media.has_raw_master = True
    media.default_version = "raw"

    # Check companion video or embedded motion photo
    if companion_video:
        vid_bytes = await companion_video.read()
        live_key = f"posts/raw_masters/{post.id}_{slide_index}_live.mov"
        s3.upload_bytes(vid_bytes, live_key, content_type="video/quicktime")
        media.is_live_photo = True
        media.s3_key_live_video = live_key
    else:
        extracted_vid, mime = extract_embedded_motion_video(file_bytes)
        if extracted_vid:
            live_key = f"posts/raw_masters/{post.id}_{slide_index}_live.mp4"
            s3.upload_bytes(extracted_vid, live_key, content_type=mime or "video/mp4")
            media.is_live_photo = True
            media.s3_key_live_video = live_key

    # Track uploaded file in session
    uploaded = list(session.uploaded_files or [])
    uploaded.append({
        "filename": file.filename,
        "slide_index": slide_index,
        "is_live_photo": media.is_live_photo,
        "size_bytes": len(file_bytes),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    })
    session.uploaded_files = uploaded

    await db.commit()
    await db.refresh(media)
    return {"status": "ok", "slide": _format_post_media(media, s3)}


@router.post("/system/shutdown")
async def shutdown_system():
    """
    Safely power down all MemWault background services:
    - Vite frontend dev server (port 5173)
    - Python uvicorn backend server (port 8000)
    - All parent cmd.exe, powershell.exe, and Windows Terminal windows
    """
    import os, sys, threading, time

    def run_shutdown():
        time.sleep(0.8)  # Wait for HTTP response to be flushed to frontend
        try:
            import psutil
            current_pid = os.getpid()
            parents_to_kill = set()
            processes_to_kill = set()

            # 1. Scan all processes for MemWault, uvicorn, vite, and node
            for p in psutil.process_iter(['pid', 'name', 'cmdline', 'ppid']):
                try:
                    cmdline = " ".join(p.info['cmdline'] or [])
                    name = (p.info['name'] or '').lower()
                    
                    is_target = False
                    if 'memwault' in cmdline.lower():
                        is_target = True
                    elif 'uvicorn' in cmdline and 'app.main:app' in cmdline:
                        is_target = True
                    elif 'vite' in cmdline or ('npm' in cmdline and 'dev' in cmdline):
                        is_target = True
                    elif name in ['node.exe', 'python.exe'] and ('5173' in cmdline or '8000' in cmdline or 'techstack' in cmdline):
                        is_target = True

                    if is_target and p.pid != current_pid:
                        processes_to_kill.add(p.pid)
                        ppid = p.info.get('ppid')
                        if ppid and ppid > 0:
                            try:
                                parent = psutil.Process(ppid)
                                pname = parent.name().lower()
                                if pname in ['cmd.exe', 'powershell.exe', 'windowsterminal.exe', 'conhost.exe', 'wt.exe']:
                                    parents_to_kill.add(ppid)
                            except Exception:
                                pass
                except Exception:
                    continue

            # 2. Scan ports 5173 and 8000
            try:
                for conn in psutil.net_connections():
                    if conn.laddr and conn.laddr.port in (5173, 8000):
                        if conn.pid and conn.pid != current_pid:
                            processes_to_kill.add(conn.pid)
                            try:
                                p = psutil.Process(conn.pid)
                                ppid = p.ppid()
                                if ppid and ppid > 0:
                                    parent = psutil.Process(ppid)
                                    pname = parent.name().lower()
                                    if pname in ['cmd.exe', 'powershell.exe', 'windowsterminal.exe', 'conhost.exe', 'wt.exe']:
                                        parents_to_kill.add(ppid)
                            except Exception:
                                pass
            except Exception:
                pass

            # 3. Kill all parent terminal windows (closes the window + all descendants)
            for ppid in parents_to_kill:
                try:
                    parent_proc = psutil.Process(ppid)
                    for child in parent_proc.children(recursive=True):
                        try:
                            child.kill()
                        except Exception:
                            pass
                    parent_proc.kill()
                except Exception:
                    pass

            # 4. Kill any remaining targeted child processes
            for pid in processes_to_kill:
                try:
                    p = psutil.Process(pid)
                    p.kill()
                except Exception:
                    pass

            # 5. Exit backend process
            try:
                psutil.Process(current_pid).kill()
            except Exception:
                os._exit(0)
        except Exception:
            os._exit(0)

    threading.Thread(target=run_shutdown, daemon=True).start()

    return {
        "status": "shutting_down",
        "message": "MemWault is powering off all background services and terminal windows."
    }


