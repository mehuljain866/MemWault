"""
MemWault REST API Routes
All endpoints for the PWA frontend to consume.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    StoryRead,
    TokenResponse,
    UserCreate,
    UserRead,
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


# ═══════════════════════════════════════════════════════════
# Story Endpoints
# ═══════════════════════════════════════════════════════════

@router.get("/stories", response_model=StoryListRead)
async def list_stories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    media_type: Optional[int] = Query(None, description="1=photo, 2=video"),
    has_music: Optional[bool] = None,
    has_location: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
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
    if story.s3_key_compressed:
        storage = get_storage()
        sr.media_url = storage.get_presigned_url(story.s3_key_compressed, expires_in=7200)
    return sr


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


# ═══════════════════════════════════════════════════════════
# Scraping Endpoints
# ═══════════════════════════════════════════════════════════

@router.post("/scrape/now", response_model=ScrapeLogRead)
async def trigger_scrape(
    body: ScrapeRequest = ScrapeRequest(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger an immediate story scrape."""
    from app.scraper.tasks import poll_stories

    log = ScrapeLog(user_id=user.id, status="running")
    db.add(log)
    await db.flush()

    # Dispatch Celery task
    poll_stories.delay(str(user.id))

    await db.refresh(log)
    return log


@router.post("/scrape/archive")
async def trigger_archive_import(
    body: ArchiveImportRequest = ArchiveImportRequest(),
    user: User = Depends(get_current_user),
):
    """
    Trigger a full historical archive import.
    This fetches ALL past stories from your Instagram archive.
    """
    from app.scraper.tasks import import_archive

    task = import_archive.delay(str(user.id), body.max_stories)
    return {"task_id": task.id, "status": "started", "max_stories": body.max_stories}


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


# ── Media serving for Local Storage fallback ─────────────
from fastapi.responses import FileResponse
from pathlib import Path

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
