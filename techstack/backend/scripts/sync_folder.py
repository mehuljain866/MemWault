import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models import Story, User
from app.scraper.metadata import MetadataWriter
from datetime import datetime, timezone

settings = get_settings()
engine = create_engine(settings.database_url_sync)

def sync_folder_to_db():
    media_dir = Path("data/media/stories")
    if not media_dir.exists():
        print("Media directory not found.")
        return

    with Session(engine) as db:
        user = db.query(User).first()
        if not user:
            print("No user found in DB.")
            return

        added_count = 0
        for root, _, files in os.walk(media_dir):
            for file in files:
                if file.startswith("story_") and (file.endswith(".mp4") or file.endswith(".jpg")):
                    file_path = Path(root) / file
                    
                    # filename format: story_YYYY-MM-DD_MEDIAID (Compressed).ext
                    try:
                        name_part = file.split(" (Compressed)")[0]
                        # name_part = story_2026-07-03_3933280507190762604_78105530379
                        parts = name_part.split("_")
                        if len(parts) >= 3:
                            date_str = parts[1]
                            ig_media_id = "_".join(parts[2:])
                        else:
                            continue

                        # Check if exists
                        existing = db.query(Story).filter(Story.ig_media_id == str(ig_media_id)).first()
                        if existing:
                            continue

                        print(f"Adding {file} to database...")
                        
                        try:
                            taken_at = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                        except ValueError:
                            taken_at = datetime.now(timezone.utc)

                        s3_key = file_path.relative_to(Path("data/media")).as_posix()
                        media_type = 2 if file.endswith(".mp4") else 1

                        new_story = Story(
                            user_id=user.id,
                            ig_media_id=str(ig_media_id),
                            taken_at=taken_at,
                            media_type=media_type,
                            s3_key_compressed=s3_key,
                            file_name=file,
                            width=1080,
                            height=1920,
                            duration_ms=15000 if media_type == 2 else None,
                            is_downloaded=True,
                            is_metadata_written=True,
                            is_uploaded_to_s3=True,
                            viewer_count=0,
                        )
                        db.add(new_story)
                        added_count += 1
                    except Exception as e:
                        print(f"Failed to process {file}: {e}")

        db.commit()
        print(f"Successfully added {added_count} stories to the database from the folder.")

if __name__ == "__main__":
    sync_folder_to_db()
