import os
import json
import subprocess
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models import Story
from datetime import datetime

settings = get_settings()
engine = create_engine(settings.database_url_sync)

def fix_db_times():
    media_dir = Path("data/media/stories")
    if not media_dir.exists():
        print("Media directory not found.")
        return

    with Session(engine) as db:
        for root, _, files in os.walk(media_dir):
            for file in files:
                if file.startswith("story_") and (file.endswith(".mp4") or file.endswith(".jpg")):
                    file_path = Path(root) / file
                    
                    try:
                        # Call exiftool to read UserComment
                        result = subprocess.run(
                            ["exiftool_bin\\exiftool.exe", "-UserComment", "-j", str(file_path)],
                            capture_output=True,
                            text=True
                        )
                        if result.returncode != 0 or not result.stdout:
                            continue
                            
                        data = json.loads(result.stdout)
                        if not data:
                            continue
                            
                        user_comment = data[0].get("UserComment")
                        if not user_comment:
                            continue
                            
                        # UserComment is a JSON string
                        comment_json = json.loads(user_comment)
                        taken_at_str = comment_json.get("taken_at")
                        ig_media_id = comment_json.get("ig_media_id")
                        
                        if taken_at_str and ig_media_id:
                            # Update the DB
                            story = db.query(Story).filter(Story.ig_media_id == str(ig_media_id)).first()
                            if story:
                                # parsed as datetime
                                taken_at_dt = datetime.fromisoformat(taken_at_str)
                                # convert to naive datetime in UTC because DB expects naive UTC
                                taken_at_naive = taken_at_dt.replace(tzinfo=None)
                                story.taken_at = taken_at_naive
                                db.commit()
                                print(f"Fixed {ig_media_id} to {taken_at_naive}")
                            
                    except Exception as e:
                        print(f"Failed to fix {file}: {e}")

if __name__ == "__main__":
    fix_db_times()
