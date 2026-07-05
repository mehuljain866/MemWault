"""
MemWault Celery Task Definitions
Background tasks for story scraping, media downloading, and metadata writing.
"""

import logging
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

logger = logging.getLogger("memwault.tasks")
settings = get_settings()

# ── Celery App ───────────────────────────────────────────
celery_app = Celery(
    "memwault",
    broker=settings.redis_url if not settings.celery_always_eager else "memory://",
    backend=settings.redis_url if not settings.celery_always_eager else "cache+memory://",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_hijack_root_logger=False,
    task_always_eager=settings.celery_always_eager,
    task_eager_propagates=settings.celery_always_eager,
)

# ── Beat Schedule (Periodic Tasks) ──────────────────────
celery_app.conf.beat_schedule = {
    "poll-instagram-stories": {
        "task": "app.scraper.tasks.poll_stories",
        "schedule": crontab(minute=f"*/{settings.story_poll_interval_minutes}"),
    },
}


# ═══════════════════════════════════════════════════════════
# Tasks
# ═══════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="app.scraper.tasks.poll_stories")
def poll_stories(self, user_id: Optional[str] = None):
    """
    Main polling task. Runs every N minutes (default: 15).
    Fetches active stories from Instagram and processes new ones.

    Pipeline:
    1. Load Instagram session (browser cookies) from database
    2. Fetch active stories via Web API
    3. For each new story:
       a. Download compressed media from CDN
       b. Write MOM metadata into file headers
       c. Upload to S3/MinIO
       d. Save story record to database
    """
    from app.scraper.instagram import InstagramScraper
    from app.scraper.metadata import MetadataWriter
    from app.storage.s3 import get_storage
    from sqlalchemy import create_engine, select as sync_select
    from sqlalchemy.orm import Session as SyncSession
    from app.models import InstagramSession, ScrapeLog, Story, StoryMusic, StoryMention
    import uuid

    logger.info("=== Story Poll Started ===")

    # ── Load session from database ──────────────────────
    sync_engine = create_engine(settings.database_url_sync)
    db = SyncSession(sync_engine)

    try:
        # Find the Instagram session for this user
        if user_id:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            ig_session = db.query(InstagramSession).filter(
                InstagramSession.user_id == user_uuid,
                InstagramSession.is_valid == True,
            ).first()
        else:
            # Fallback: get any valid session
            ig_session = db.query(InstagramSession).filter(
                InstagramSession.is_valid == True,
            ).first()

        if not ig_session or not ig_session.session_data:
            logger.error("No valid Instagram session found in database")
            # Update the scrape log if user_id is provided
            if user_id:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                scrape_log = db.query(ScrapeLog).filter(
                    ScrapeLog.user_id == user_uuid,
                    ScrapeLog.status == "running",
                ).order_by(ScrapeLog.started_at.desc()).first()
                if scrape_log:
                    scrape_log.status = "error"
                    scrape_log.error_message = "No Instagram session found. Please connect your account in Settings."
                    db.commit()
            return {"status": "error", "message": "No Instagram session found. Connect your account first."}

        session_data = ig_session.session_data
        ig_username = ig_session.ig_username

        # Create scraper with saved browser cookies
        scraper = InstagramScraper(
            username=ig_username,
            session_data=session_data,
        )

        try:
            scraper.login()
            logger.info("Instagram login successful via saved session for @%s", ig_username)
        except Exception as e:
            logger.error("Instagram login failed: %s", e)
            if user_id:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                scrape_log = db.query(ScrapeLog).filter(
                    ScrapeLog.user_id == user_uuid,
                    ScrapeLog.status == "running",
                ).order_by(ScrapeLog.started_at.desc()).first()
                if scrape_log:
                    scrape_log.status = "error"
                    scrape_log.error_message = str(e)
                    db.commit()
            return {"status": "error", "message": str(e)}

        # Fetch active stories
        try:
            stories = scraper.fetch_own_stories()
            logger.info("Found %d active stories", len(stories))
        except Exception as e:
            logger.error("Story fetch failed: %s", e)
            if user_id:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                scrape_log = db.query(ScrapeLog).filter(
                    ScrapeLog.user_id == user_uuid,
                    ScrapeLog.status == "running",
                ).order_by(ScrapeLog.started_at.desc()).first()
                if scrape_log:
                    scrape_log.status = "error"
                    scrape_log.error_message = str(e)
                    db.commit()
            return {"status": "error", "message": str(e)}

        if not stories:
            logger.info("No active stories found")
            if user_id:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                scrape_log = db.query(ScrapeLog).filter(
                    ScrapeLog.user_id == user_uuid,
                    ScrapeLog.status == "running",
                ).order_by(ScrapeLog.started_at.desc()).first()
                if scrape_log:
                    scrape_log.status = "success"
                    scrape_log.stories_found = 0
                    scrape_log.stories_new = 0
                    db.commit()
            return {"status": "success", "stories_found": 0, "stories_new": 0}

        storage = get_storage()
        new_count = 0

        with tempfile.TemporaryDirectory(prefix="memwault_") as tmp_dir:
            download_dir = Path(tmp_dir)

            for story_data in stories:
                media_id = story_data.get("ig_media_id", "unknown")

                # Check if story already exists in the database
                existing = db.query(Story).filter(
                    Story.ig_media_id == str(media_id),
                ).first()
                if existing:
                    logger.info("Story %s already archived, updating views", media_id)
                    # Update viewer count if present in new fetch
                    new_viewer_count = story_data.get("viewer_count")
                    if new_viewer_count is not None:
                        existing.viewer_count = new_viewer_count
                        db.commit()
                    continue

                try:
                    # Step 1: Download media
                    file_path = scraper.download_story_media(story_data, download_dir)
                    if not file_path:
                        logger.warning("Skipping story %s: download failed", media_id)
                        continue

                    # Step 2: Write metadata into file headers
                    MetadataWriter.write_metadata(file_path, story_data)

                    # Step 3: Upload to storage
                    taken_at = story_data.get("taken_at", datetime.now(timezone.utc))
                    if isinstance(taken_at, str):
                        taken_at = datetime.fromisoformat(taken_at)

                    date_prefix = taken_at.strftime("%Y/%m")
                    s3_key = f"stories/{date_prefix}/{file_path.name}"

                    storage.upload_file(file_path, s3_key)

                    # Step 4: Save story record to the database
                    new_story = Story(
                        user_id=user_id or ig_session.user_id,
                        ig_media_id=str(media_id),
                        ig_media_pk=story_data.get("ig_media_pk", ""),
                        ig_user_id=story_data.get("ig_user_id", ""),
                        taken_at=taken_at,
                        expires_at=story_data.get("expires_at"),
                        media_type=story_data.get("media_type", 1),
                        cdn_url=story_data.get("cdn_url", ""),
                        s3_key_compressed=s3_key,
                        file_name=file_path.name,
                        width=story_data.get("width", 1080),
                        height=story_data.get("height", 1920),
                        duration_ms=story_data.get("duration_ms"),
                        caption_text=story_data.get("caption_text"),
                        location_name=story_data.get("location_name"),
                        location_lat=story_data.get("location_lat"),
                        location_lng=story_data.get("location_lng"),
                        location_id=story_data.get("location_id"),
                        is_downloaded=True,
                        is_metadata_written=True,
                        is_uploaded_to_s3=True,
                        viewer_count=story_data.get("viewer_count", 0),
                    )
                    db.add(new_story)
                    db.flush()

                    # Save music metadata if present
                    if story_data.get("music"):
                        music = story_data["music"]
                        story_music = StoryMusic(
                            story_id=new_story.id,
                            track_title=music.get("track_title", "Unknown"),
                            artist_name=music.get("artist_name", "Unknown"),
                            ig_audio_id=music.get("ig_audio_id"),
                            ig_audio_asset_id=music.get("ig_audio_asset_id"),
                            start_time_ms=music.get("start_time_ms"),
                            play_duration_ms=music.get("play_duration_ms"),
                            cover_art_url=music.get("cover_art_url"),
                            x=music.get("x"),
                            y=music.get("y"),
                            width=music.get("width"),
                            height=music.get("height"),
                            rotation=music.get("rotation"),
                        )
                        db.add(story_music)

                    # Save mentions
                    for mention in story_data.get("mentions", []):
                        story_mention = StoryMention(
                            story_id=new_story.id,
                            username=mention.get("username", ""),
                            ig_user_id=mention.get("ig_user_id"),
                            x=mention.get("x"),
                            y=mention.get("y"),
                            width=mention.get("width"),
                            height=mention.get("height"),
                            rotation=mention.get("rotation"),
                        )
                        db.add(story_mention)

                    # Save stickers
                    from app.models import StorySticker
                    for sticker in story_data.get("stickers", []):
                        story_sticker = StorySticker(
                            story_id=new_story.id,
                            sticker_type=sticker.get("sticker_type", "unknown"),
                            sticker_data=sticker.get("sticker_data", {}),
                            x=sticker.get("x"),
                            y=sticker.get("y"),
                            width=sticker.get("width"),
                            height=sticker.get("height"),
                            rotation=sticker.get("rotation"),
                            z_index=sticker.get("z_index"),
                        )
                        db.add(story_sticker)

                    db.commit()
                    new_count += 1
                    logger.info("Processed story: %s -> %s", media_id, s3_key)

                except Exception as e:
                    logger.error("Error processing story %s: %s", media_id, e)
                    db.rollback()
                    continue

        # Update scrape log with results
        if user_id:
            scrape_log = db.query(ScrapeLog).filter(
                ScrapeLog.user_id == user_id,
                ScrapeLog.status == "running",
            ).order_by(ScrapeLog.started_at.desc()).first()
            if scrape_log:
                scrape_log.status = "success"
                scrape_log.stories_found = len(stories)
                scrape_log.stories_new = new_count
                db.commit()

        result = {
            "status": "success",
            "stories_found": len(stories),
            "stories_new": new_count,
        }
        logger.info("=== Story Poll Complete: %s ===", result)
        return result

    finally:
        db.close()
        sync_engine.dispose()


@celery_app.task(bind=True, name="app.scraper.tasks.import_archive")
def import_archive(self, user_id: str, max_stories: Optional[int] = None):
    """
    Import all historical stories from the user's Instagram archive.
    This is a one-time bulk import task.
    """
    from app.scraper.instagram import InstagramScraper
    from app.scraper.metadata import MetadataWriter
    from app.storage.s3 import get_storage
    from app.database import sync_engine
    from sqlalchemy.orm import Session
    from app.models import InstagramSession
    import uuid

    logger.info("=== Archive Import Started (max: %s) ===", max_stories)

    db = Session(sync_engine)
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        ig_session = db.query(InstagramSession).filter(
            InstagramSession.user_id == user_uuid,
            InstagramSession.is_valid == True
        ).first()

        if not ig_session:
            return {"status": "error", "message": "No Instagram session found. Please connect your account."}

        scraper = InstagramScraper(
            username=ig_session.ig_username,
            session_data=ig_session.session_data,
        )

        try:
            scraper.login()
        except Exception as e:
            logger.error("Login failed for archive import: %s", e)
            return {"status": "error", "message": str(e)}

        try:
            stories = scraper.fetch_archive_stories(max_stories=max_stories)
            logger.info("Archive contains %d stories", len(stories))
        except Exception as e:
            logger.error("Archive fetch failed: %s", e)
            return {"status": "error", "message": str(e)}

        storage = get_storage()
        processed = 0

        with tempfile.TemporaryDirectory(prefix="memwault_archive_") as tmp_dir:
            download_dir = Path(tmp_dir)

            for story_data in stories:
                media_id = story_data.get("ig_media_id", "unknown")

                try:
                    file_path = scraper.download_story_media(story_data, download_dir)
                    if not file_path:
                        continue

                    MetadataWriter.write_metadata(file_path, story_data)

                    taken_at = story_data.get("taken_at", datetime.now(timezone.utc))
                    if isinstance(taken_at, str):
                        taken_at = datetime.fromisoformat(taken_at)

                    date_prefix = taken_at.strftime("%Y/%m")
                    s3_key = f"stories/{date_prefix}/{file_path.name}"

                    storage.upload_file(file_path, s3_key)
                    processed += 1

                    # Update progress
                    self.update_state(
                        state="PROGRESS",
                        meta={"current": processed, "total": len(stories)},
                    )

                except Exception as e:
                    logger.error("Archive story %s failed: %s", media_id, e)
                    continue

        result = {
            "status": "success",
            "total_archive": len(stories),
            "processed": processed,
        }
        logger.info("=== Archive Import Complete: %s ===", result)
        return result
    finally:
        db.close()
        sync_engine.dispose()


@celery_app.task(name="app.scraper.tasks.enrich_spotify")
def enrich_spotify(story_id: str, track_title: str, artist_name: str):
    """
    Look up a track on Spotify and write the Spotify URL/ID
    back to the story's music metadata.
    """
    try:
        import spotipy
        from spotipy.oauth2 import SpotifyClientCredentials

        if not settings.spotify_client_id or not settings.spotify_client_secret:
            logger.info("Spotify credentials not configured, skipping enrichment")
            return None

        sp = spotipy.Spotify(
            auth_manager=SpotifyClientCredentials(
                client_id=settings.spotify_client_id,
                client_secret=settings.spotify_client_secret,
            )
        )

        query = f"track:{track_title} artist:{artist_name}"
        results = sp.search(q=query, type="track", limit=1)

        tracks = results.get("tracks", {}).get("items", [])
        if not tracks:
            logger.info("No Spotify match for: %s - %s", track_title, artist_name)
            return None

        track = tracks[0]
        spotify_data = {
            "spotify_track_id": track["id"],
            "spotify_url": track["external_urls"].get("spotify"),
            "spotify_uri": track["uri"],
        }

        logger.info("Spotify match: %s -> %s", query, spotify_data["spotify_url"])
        return spotify_data

    except Exception as e:
        logger.error("Spotify enrichment failed: %s", e)
        return None
