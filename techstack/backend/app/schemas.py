"""
MemWault Pydantic Schemas
Request/response models for the REST API.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════
# Auth
# ═══════════════════════════════════════════════════════════

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6)


class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    created_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Instagram Session
# ═══════════════════════════════════════════════════════════

class InstagramLoginRequest(BaseModel):
    ig_username: str
    ig_password: Optional[str] = None
    sessionid: Optional[str] = None


class BrowserLoginResponse(BaseModel):
    status: str  # "browser_opened", "login_success", "login_failed"
    ig_username: Optional[str] = None
    message: Optional[str] = None


class InstagramSessionRead(BaseModel):
    id: uuid.UUID
    ig_username: str
    ig_user_id: Optional[str] = None
    is_valid: bool
    last_login: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Story Music
# ═══════════════════════════════════════════════════════════

class StoryMusicRead(BaseModel):
    id: uuid.UUID
    track_title: str
    artist_name: str
    ig_audio_id: Optional[str] = None
    start_time_ms: Optional[int] = None
    play_duration_ms: Optional[int] = None
    spotify_track_id: Optional[str] = None
    spotify_url: Optional[str] = None
    cover_art_url: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Story Mention
# ═══════════════════════════════════════════════════════════

class StoryMentionRead(BaseModel):
    id: uuid.UUID
    username: str
    ig_user_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Story Sticker
# ═══════════════════════════════════════════════════════════

class StoryStickerRead(BaseModel):
    id: uuid.UUID
    sticker_type: str
    sticker_data: Optional[dict] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = None
    z_index: Optional[int] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Story Link
# ═══════════════════════════════════════════════════════════

class StoryLinkRead(BaseModel):
    id: uuid.UUID
    url: str
    display_url: Optional[str] = None
    link_title: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Story Poll
# ═══════════════════════════════════════════════════════════

class StoryPollRead(BaseModel):
    id: uuid.UUID
    poll_type: str
    question_text: Optional[str] = None
    options: Optional[dict] = None
    total_votes: Optional[int] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Story Viewer
# ═══════════════════════════════════════════════════════════

class StoryViewerRead(BaseModel):
    id: uuid.UUID
    ig_user_id: str
    username: str
    full_name: Optional[str] = None
    profile_pic_url: Optional[str] = None
    viewed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Story (Full MOM Read)
# ═══════════════════════════════════════════════════════════

class StoryRead(BaseModel):
    id: uuid.UUID
    ig_media_id: str
    ig_media_pk: Optional[str] = None

    # Timestamps
    taken_at: datetime
    expires_at: Optional[datetime] = None
    archived_at: datetime

    # Media
    media_type: int
    file_name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_ms: Optional[int] = None
    media_url: Optional[str] = None  # Pre-signed S3 URL, populated at read time

    # Location
    location_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None

    # Caption / Notes
    caption_text: Optional[str] = None
    journal_note: Optional[str] = None

    # Processing flags
    is_downloaded: bool
    is_metadata_written: bool
    is_uploaded_to_s3: bool
    
    # Reel/Memory Dual Mode
    is_reel: bool
    is_memory: bool
    is_trashed: bool = False
    primary_view: str
    og_reel_media_id: Optional[str] = None
    og_reel_url: Optional[str] = None  # Pre-signed S3 URL for OG Reel
    og_reel_likes: Optional[int] = None
    og_reel_plays: Optional[int] = None

    # Engagement
    viewer_count: Optional[int] = None

    # Related entities
    music: Optional[StoryMusicRead] = None
    mentions: list[StoryMentionRead] = []
    stickers: list[StoryStickerRead] = []
    links: list[StoryLinkRead] = []
    polls: list[StoryPollRead] = []

    model_config = {"from_attributes": True}


class StoryUpdate(BaseModel):
    is_memory: Optional[bool] = None
    is_trashed: Optional[bool] = None
    is_reel: Optional[bool] = None
    primary_view: Optional[str] = None
    journal_note: Optional[str] = None


class StoryBulkUpdate(BaseModel):
    story_ids: list[uuid.UUID]
    is_trashed: Optional[bool] = None
    is_memory: Optional[bool] = None
    is_reel: Optional[bool] = None


class StoryListRead(BaseModel):
    """Paginated story list response."""
    stories: list[StoryRead]
    total: int
    page: int
    page_size: int
    has_next: bool

class StoryLocationRead(BaseModel):
    """Lightweight story model for map plotting."""
    id: uuid.UUID
    ig_media_id: str
    taken_at: datetime
    media_type: int
    location_name: Optional[str] = None
    location_lat: float
    location_lng: float
    media_url: Optional[str] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# Scrape Operations
# ═══════════════════════════════════════════════════════════

class ScrapeRequest(BaseModel):
    """Trigger a manual scrape job."""
    force: bool = False  # Re-scrape even if already scraped recently


class ScrapeLogRead(BaseModel):
    id: uuid.UUID
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    stories_found: int
    stories_new: int
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class ArchiveImportRequest(BaseModel):
    """Request to import all historical stories from your archive."""
    max_stories: Optional[int] = None  # Limit for testing


# ═══════════════════════════════════════════════════════════
# Dashboard Stats
# ═══════════════════════════════════════════════════════════

class DashboardStats(BaseModel):
    total_stories: int
    total_photos: int
    total_videos: int
    total_with_music: int
    total_with_location: int
    total_mentions: int
    storage_used_mb: float
    last_scrape: Optional[ScrapeLogRead] = None
    ig_session_valid: bool


# ═══════════════════════════════════════════════════════════
# Adjacent Stories
# ═══════════════════════════════════════════════════════════

class AdjacentStoriesRead(BaseModel):
    """Adjacent story IDs for chronological navigation."""
    prev_id: Optional[uuid.UUID] = None
    next_id: Optional[uuid.UUID] = None

# ═══════════════════════════════════════════════════════════
# Highlight Schemas
# ═══════════════════════════════════════════════════════════

class HighlightResponse(BaseModel):
    id: uuid.UUID
    ig_highlight_id: str
    title: str
    cover_media_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HighlightStoryLinkResponse(BaseModel):
    id: uuid.UUID
    highlight_id: uuid.UUID
    story_id: uuid.UUID
    added_at: datetime

    class Config:
        from_attributes = True


class ManualHighlightCreate(BaseModel):
    title: str
    story_ids: list[uuid.UUID]
