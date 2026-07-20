import os
import json
import logging
import asyncio
from pathlib import Path
from datetime import datetime, timezone
import requests
import tempfile

import sys
sys.path.append(str(Path(__file__).parent))

from app.database import Base, engine, async_session
from sqlalchemy.future import select
from app.models import Story, InstagramSession
from app.scraper.instagram import InstagramScraper
from app.scraper.metadata import MetadataWriter
from app.storage.s3 import get_storage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("retroactive")

async def main():
    async with async_session() as db:
        storage = get_storage()
        
        result = await db.execute(select(Story).filter(Story.is_reel == True))
        stories = result.scalars().all()
        logger.info(f"Found {len(stories)} stories marked as reels.")

        if not stories:
            return

        result = await db.execute(select(InstagramSession).filter(InstagramSession.is_valid == True))
        ig_session = result.scalars().first()
        if not ig_session:
            logger.error("No valid Instagram session found.")
            return

        scraper = InstagramScraper(username=ig_session.ig_username, session_data=ig_session.session_data)
        scraper.login()

        with tempfile.TemporaryDirectory() as tmp_dir:
            download_dir = Path(tmp_dir)
            
            for story in stories:
                logger.info(f"Processing story {story.ig_media_id}")
                
                # Step 1: Extract og_reel_media_id if missing
                if not story.og_reel_media_id and story.raw_api_response:
                    raw = story.raw_api_response
                    creative_config = raw.get("creative_config", {})
                    stickers = raw.get("story_sticker_items", []) or creative_config.get("sticker_items", [])
                    
                    for sticker in stickers:
                        if sticker.get("type") in ("story_reels_media", "reels_media", "feed_media"):
                            media = sticker.get("media", {})
                            if media.get("id"):
                                story.og_reel_media_id = str(media.get("id"))
                                logger.info(f"Extracted OG Media ID: {story.og_reel_media_id}")
                                break
                
                if not story.og_reel_media_id:
                    logger.warning(f"Could not find og_reel_media_id for {story.ig_media_id}")
                    continue
                    
                # Step 2: Fetch Reel Stats
                try:
                    stats = scraper.fetch_reel_stats(story.og_reel_media_id)
                    story.og_reel_likes = stats.get("like_count")
                    story.og_reel_plays = stats.get("play_count")
                    
                    video_url = stats.get("video_url")
                    if video_url and not story.og_reel_s3_key:
                        og_path = download_dir / f"og_reel_{story.og_reel_media_id}.mp4"
                        with requests.get(video_url, stream=True) as r:
                            r.raise_for_status()
                            with open(og_path, "wb") as f:
                                for chunk in r.iter_content(chunk_size=8192):
                                    f.write(chunk)
                        
                        story_data = {
                            "ig_media_id": story.ig_media_id,
                            "media_type": story.media_type,
                            "taken_at": story.taken_at,
                            "viewer_count": story.viewer_count,
                            "og_reel_likes": story.og_reel_likes,
                            "og_reel_plays": story.og_reel_plays,
                            "caption_text": story.caption_text,
                            "location_name": story.location_name,
                            "location_lat": story.location_lat,
                            "location_lng": story.location_lng
                        }
                        MetadataWriter.write_metadata(og_path, story_data)
                        
                        date_prefix = story.taken_at.strftime("%Y/%m")
                        s3_key = f"stories/{date_prefix}/og_reel_{story.og_reel_media_id}.mp4"
                        storage.upload_file(og_path, s3_key)
                        story.og_reel_s3_key = s3_key
                        logger.info(f"Downloaded and uploaded OG reel to {s3_key}")
                        
                except Exception as e:
                    logger.error(f"Failed to process OG reel for {story.ig_media_id}: {e}")
                    
                await db.commit()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())
