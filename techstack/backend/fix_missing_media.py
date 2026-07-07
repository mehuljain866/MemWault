import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from pathlib import Path
from app.scraper.instagram import InstagramScraper
from app.storage.s3 import get_storage
from datetime import datetime, timezone
from app.models import InstagramSession
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.config import get_settings
import tempfile
import uuid

def fix_missing_media():
    settings = get_settings()
    sync_engine = create_engine(settings.database_url_sync)
    db = Session(sync_engine)
    
    # Get user session
    ig_session = db.query(InstagramSession).filter(InstagramSession.is_valid == True).first()
    if not ig_session:
        print("No IG session")
        return
        
    scraper = InstagramScraper(
        username=ig_session.ig_username,
        session_data=ig_session.session_data,
    )
    
    try:
        scraper.login()
    except Exception as e:
        print(f"Login failed: {e}")
        return
        
    print("Fetching archive stories...")
    try:
        stories = scraper.fetch_archive_stories(max_stories=20)
    except Exception as e:
        print(f"Fetch failed: {e}")
        return
        
    storage = get_storage()
    
    with tempfile.TemporaryDirectory(prefix="memwault_archive_") as tmp_dir:
        download_dir = Path(tmp_dir)
        
        for story_data in stories:
            media_id = story_data.get("ig_media_id", "unknown")
            
            # Re-download
            print(f"Downloading {media_id}...")
            file_path = scraper.download_story_media(story_data, download_dir)
            if not file_path:
                print(f"Failed to download {media_id}")
                continue
                
            taken_at = story_data.get("taken_at", datetime.now(timezone.utc))
            if isinstance(taken_at, str):
                taken_at = datetime.fromisoformat(taken_at)
                
            date_prefix = taken_at.strftime("%Y/%m")
            s3_key = f"stories/{date_prefix}/{file_path.name}"
            
            print(f"Uploading {s3_key}...")
            storage.upload_file(file_path, s3_key)
            print(f"Successfully repaired {s3_key}")

if __name__ == '__main__':
    fix_missing_media()
