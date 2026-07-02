"""
MemWault SQLAlchemy ORM Models
Implements the Memory Object Model (MOM) schema.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    UUID,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ═══════════════════════════════════════════════════════════
# User & Auth
# ═══════════════════════════════════════════════════════════

class User(Base):
    """Application user (owner of MemWault instance)."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    instagram_sessions: Mapped[list["InstagramSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    stories: Mapped[list["Story"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class InstagramSession(Base):
    """Cached Instagram session cookies for cloud polling."""
    __tablename__ = "instagram_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    ig_username: Mapped[str] = mapped_column(String(64), index=True)
    ig_user_id: Mapped[str] = mapped_column(String(32), nullable=True)
    session_data: Mapped[dict] = mapped_column(JSON, default=dict)
    device_settings: Mapped[dict] = mapped_column(JSON, default=dict)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="instagram_sessions")


# ═══════════════════════════════════════════════════════════
# Memory Object Model (MOM) — Core
# ═══════════════════════════════════════════════════════════

class Story(Base):
    """
    A single Instagram story item — the core Memory node.
    Stores both the compressed media reference and the full layout manifest.
    """
    __tablename__ = "stories"
    __table_args__ = (
        UniqueConstraint("ig_media_id", name="uq_stories_ig_media_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )

    # ── Instagram Identifiers ────────────────────────────
    ig_media_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    ig_media_pk: Mapped[str] = mapped_column(String(64), nullable=True)
    ig_user_id: Mapped[str] = mapped_column(String(32), nullable=True)

    # ── Timestamps ───────────────────────────────────────
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # ── Media ────────────────────────────────────────────
    media_type: Mapped[int] = mapped_column(Integer)  # 1=photo, 2=video
    cdn_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    s3_key_compressed: Mapped[str | None] = mapped_column(String(512), nullable=True)
    s3_key_original: Mapped[str | None] = mapped_column(String(512), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Location ─────────────────────────────────────────
    location_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    location_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # ── Caption / Text ───────────────────────────────────
    caption_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Full Layout Manifest (JSON) ──────────────────────
    # This is the .mem manifest.json content — sticker coordinates,
    # text layers, mention positions, link placements, etc.
    manifest: Mapped[dict] = mapped_column(JSON, nullable=True)

    # ── Raw API Response (for future-proofing) ───────────
    raw_api_response: Mapped[dict] = mapped_column(JSON, nullable=True)

    # ── Engagement Metrics ───────────────────────────────
    viewer_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Processing State ─────────────────────────────────
    is_downloaded: Mapped[bool] = mapped_column(Boolean, default=False)
    is_metadata_written: Mapped[bool] = mapped_column(Boolean, default=False)
    is_uploaded_to_s3: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="stories")
    music: Mapped["StoryMusic | None"] = relationship(
        back_populates="story", cascade="all, delete-orphan", uselist=False
    )
    mentions: Mapped[list["StoryMention"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )
    stickers: Mapped[list["StorySticker"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )
    viewers: Mapped[list["StoryViewer"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )
    links: Mapped[list["StoryLink"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )
    polls: Mapped[list["StoryPoll"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )


# ═══════════════════════════════════════════════════════════
# MOM — Related Entities
# ═══════════════════════════════════════════════════════════

class StoryMusic(Base):
    """Music track metadata attached to a story."""
    __tablename__ = "story_music"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE")
    )

    track_title: Mapped[str] = mapped_column(String(512))
    artist_name: Mapped[str] = mapped_column(String(512))
    ig_audio_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ig_audio_asset_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    start_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    play_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spotify_track_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    spotify_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cover_art_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # Coordinates on the story canvas
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    rotation: Mapped[float | None] = mapped_column(Float, nullable=True)

    story: Mapped["Story"] = relationship(back_populates="music")


class StoryMention(Base):
    """User mentions / tags placed on a story."""
    __tablename__ = "story_mentions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE")
    )

    username: Mapped[str] = mapped_column(String(64))
    ig_user_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    rotation: Mapped[float | None] = mapped_column(Float, nullable=True)

    story: Mapped["Story"] = relationship(back_populates="mentions")


class StorySticker(Base):
    """Generic sticker entity (location, hashtag, emoji slider, quiz, countdown, etc.)."""
    __tablename__ = "story_stickers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE")
    )

    sticker_type: Mapped[str] = mapped_column(String(64))  # location, hashtag, emoji_slider, quiz, countdown, question
    sticker_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    rotation: Mapped[float | None] = mapped_column(Float, nullable=True)
    z_index: Mapped[int | None] = mapped_column(Integer, nullable=True)

    story: Mapped["Story"] = relationship(back_populates="stickers")


class StoryLink(Base):
    """Link stickers embedded in a story."""
    __tablename__ = "story_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE")
    )

    url: Mapped[str] = mapped_column(Text)
    display_url: Mapped[str | None] = mapped_column(String(256), nullable=True)
    link_title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    rotation: Mapped[float | None] = mapped_column(Float, nullable=True)

    story: Mapped["Story"] = relationship(back_populates="links")


class StoryPoll(Base):
    """Poll / quiz stickers with final vote tallies."""
    __tablename__ = "story_polls"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE")
    )

    poll_type: Mapped[str] = mapped_column(String(32))  # poll, quiz, emoji_slider, question
    question_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    options: Mapped[dict] = mapped_column(JSON, nullable=True)  # [{text, vote_count, is_correct}, ...]
    total_votes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    rotation: Mapped[float | None] = mapped_column(Float, nullable=True)

    story: Mapped["Story"] = relationship(back_populates="polls")


class StoryViewer(Base):
    """Users who viewed a story (captured before expiration)."""
    __tablename__ = "story_viewers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE")
    )

    ig_user_id: Mapped[str] = mapped_column(String(32))
    username: Mapped[str] = mapped_column(String(64))
    full_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    profile_pic_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    story: Mapped["Story"] = relationship(back_populates="viewers")


# ═══════════════════════════════════════════════════════════
# Scraper Job Tracking
# ═══════════════════════════════════════════════════════════

class ScrapeLog(Base):
    """Log entry for each scraping cycle."""
    __tablename__ = "scrape_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="running")  # running, success, error
    stories_found: Mapped[int] = mapped_column(Integer, default=0)
    stories_new: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
