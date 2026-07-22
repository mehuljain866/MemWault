"""
MemWault Metadata Writer
Injects the full MOM metadata into JPEG/MP4 file headers
using Pillow (piexif) for images and custom MP4 box writing for videos.

This enables gallery-level visibility of story context:
- Location maps in Samsung Gallery / Google Photos
- Searchable tags in Google Photos
- Music info in file descriptions
"""

import json
import logging
import subprocess
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("memwault.metadata")

class MetadataWriter:
    """
    Writes MemWault metadata into media files using ExifTool.
    Injects standard tags (Title, Description, GPS, CreateDate) 
    and custom XMP-Memwault tags so they are readable in all galleries.
    """

    @staticmethod
    def write_metadata(file_path: Path, story_data: dict) -> bool:
        """
        Uses exiftool to inject metadata.
        Returns True if successful.
        """
        try:
            backend_dir = Path(__file__).parent.parent.parent
            exiftool_path = backend_dir / "exiftool_bin" / "exiftool.exe"
            config_path = backend_dir / "memwault.config"

            if not exiftool_path.exists():
                logger.error("Exiftool not found at %s", exiftool_path)
                return False

            cmd = [
                str(exiftool_path),
                "-config", str(config_path),
                "-overwrite_original",
                "-m" # Ignore minor errors
            ]

            # ── 1. Standard Tags ──────────────────────────────────────────
            description_parts = []
            caption = story_data.get("caption_text")
            if caption:
                description_parts.append(f"📝 Caption: {caption}")

            journal = story_data.get("journal_note")
            if journal:
                description_parts.append(f"📔 Journal:\n{journal}\n")

            music = story_data.get("music")
            if music:
                description_parts.append(f"🎵 Music: {music.get('track_title', '')} — {music.get('artist_name', '')}")

            location_name = story_data.get("location_name")
            if location_name:
                description_parts.append(f"📍 Location: {location_name}")

            mentions = story_data.get("mentions", [])
            if mentions:
                mention_str = " ".join(f"@{m.get('username', '')}" for m in mentions)
                description_parts.append(f"👥 Tags: {mention_str}")
                
            viewer_count = story_data.get("viewer_count", 0)
            like_count = story_data.get("like_count", 0)
            if viewer_count > 0 or like_count > 0:
                description_parts.append(f"📊 Engagement: {viewer_count} Views, {like_count} Likes")

            if description_parts:
                desc = "\n".join(description_parts)
                cmd.extend(["-Description=" + desc, "-ImageDescription=" + desc, "-Title=" + desc])

            taken_at = story_data.get("taken_at")
            if taken_at:
                if isinstance(taken_at, str):
                    taken_at = datetime.fromisoformat(taken_at.replace("Z", "+00:00"))
                # EXIF date format is YYYY:MM:DD HH:MM:SS
                dt_str = taken_at.strftime("%Y:%m:%d %H:%M:%S")
                cmd.extend([
                    "-DateTimeOriginal=" + dt_str,
                    "-CreateDate=" + dt_str,
                    "-ModifyDate=" + dt_str
                ])

            lat = story_data.get("location_lat")
            lng = story_data.get("location_lng")
            if lat is not None and lng is not None:
                cmd.extend([
                    f"-GPSLatitude={abs(lat)}",
                    f"-GPSLatitudeRef={'N' if lat >= 0 else 'S'}",
                    f"-GPSLongitude={abs(lng)}",
                    f"-GPSLongitudeRef={'E' if lng >= 0 else 'W'}"
                ])
                
            is_ai = story_data.get("is_ai_generated", False)
            if is_ai:
                cmd.append("-Iptc4xmpExt:DigitalSourceType=trainedAlgorithmicMedia")

            # ── 2. Custom Memwault Tags (XMP-Memwault) ─────────────────────
            viewer_count = story_data.get("viewer_count", 0)
            cmd.append(f"-XMP-Memwault:ViewerCount={viewer_count}")
            like_count = story_data.get("like_count", 0)
            cmd.append(f"-XMP-Memwault:LikeCount={like_count}")
            
            if music:
                cmd.append(f"-XMP-Memwault:MusicArtist={music.get('artist_name', '')}")
                cmd.append(f"-XMP-Memwault:MusicTitle={music.get('track_title', '')}")
                
            og_likes = story_data.get("og_reel_likes")
            if og_likes is not None:
                cmd.append(f"-XMP-Memwault:OgReelLikes={og_likes}")
                
            og_plays = story_data.get("og_reel_plays")
            if og_plays is not None:
                cmd.append(f"-XMP-Memwault:OgReelPlays={og_plays}")

            # Embed full JSON data to guarantee portability
            mom_json = MetadataWriter._build_mom_json(story_data)
            json_str = json.dumps(mom_json, ensure_ascii=False)
            cmd.append(f"-XMP-Memwault:MomData={json_str}")

            # Execute exiftool
            cmd.append(str(file_path))
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            
            logger.info("Universal XMP metadata written to %s", file_path.name)
            return True

        except subprocess.CalledProcessError as e:
            logger.error("ExifTool failed on %s: %s\nStderr: %s", file_path, e, e.stderr)
            return False
        except Exception as e:
            logger.error("Failed to write metadata to %s: %s", file_path, e)
            return False

    @staticmethod
    def _build_mom_json(story_data: dict) -> dict:
        result = {
            "memwault_version": "0.1.0",
            "ig_media_id": story_data.get("ig_media_id"),
            "media_type": "video" if story_data.get("media_type") == 2 else "photo",
            "viewer_count": story_data.get("viewer_count", 0),
            "like_count": story_data.get("like_count", 0),
            "og_reel_likes": story_data.get("og_reel_likes"),
            "og_reel_plays": story_data.get("og_reel_plays")
        }
        
        taken_at = story_data.get("taken_at")
        if taken_at:
            if isinstance(taken_at, datetime):
                taken_at = taken_at.isoformat()
            result["taken_at"] = taken_at
            
        if story_data.get("location_name"):
            result["location"] = {
                "name": story_data["location_name"],
                "lat": story_data.get("location_lat"),
                "lng": story_data.get("location_lng")
            }
            
        if story_data.get("music"):
            m = story_data["music"]
            result["music"] = {
                "track_title": m.get("track_title"),
                "artist_name": m.get("artist_name")
            }
            
        # We can also store the literal list of viewers if it was scraped!
        # The frontend/backend doesn't currently scrape full viewer names list for stories 
        # (Instagram API for that is `viewers` edge, requiring pagination).
        # But if it does, it will go straight into `mom_data` here!
        if story_data.get("viewers_list"):
            result["viewers_list"] = story_data["viewers_list"]

        return result
