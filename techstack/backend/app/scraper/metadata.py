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
import struct
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Optional

import piexif
from PIL import Image

logger = logging.getLogger("memwault.metadata")


class MetadataWriter:
    """
    Writes MemWault metadata into media files using standard EXIF/IPTC
    headers (for JPEG) and QuickTime user data atoms (for MP4).
    """

    @staticmethod
    def write_metadata(
        file_path: Path,
        story_data: dict,
    ) -> bool:
        """
        Main entry point. Detects file type and delegates to the
        appropriate writer.

        Returns True if metadata was successfully written.
        """
        suffix = file_path.suffix.lower()

        try:
            if suffix in (".jpg", ".jpeg", ".heic"):
                MetadataWriter._write_jpeg_metadata(file_path, story_data)
                return True
            elif suffix in (".mp4", ".mov"):
                MetadataWriter._write_mp4_metadata(file_path, story_data)
                return True
            else:
                logger.warning("Unsupported file type for metadata: %s", suffix)
                return False
        except Exception as e:
            logger.error("Failed to write metadata to %s: %s", file_path, e)
            return False

    # ── JPEG Metadata Writer ─────────────────────────────

    @staticmethod
    def _write_jpeg_metadata(file_path: Path, story_data: dict):
        """
        Write EXIF metadata into a JPEG file using piexif.

        Writes to:
        - EXIF DateTimeOriginal: Story posting timestamp
        - EXIF GPSLatitude/Longitude: Location sticker coordinates
        - EXIF UserComment: Full MOM JSON schema
        - EXIF ImageDescription: Caption text + music info
        """
        # Load existing EXIF or create new
        try:
            exif_dict = piexif.load(str(file_path))
        except Exception:
            exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}}

        # ── DateTimeOriginal ────────────────────────────
        taken_at = story_data.get("taken_at")
        if taken_at:
            if isinstance(taken_at, str):
                taken_at = datetime.fromisoformat(taken_at)
            dt_str = taken_at.strftime("%Y:%m:%d %H:%M:%S")
            exif_dict["Exif"][piexif.ExifIFD.DateTimeOriginal] = dt_str.encode()
            exif_dict["0th"][piexif.ImageIFD.DateTime] = dt_str.encode()

        # ── GPS Coordinates ─────────────────────────────
        lat = story_data.get("location_lat")
        lng = story_data.get("location_lng")
        if lat is not None and lng is not None:
            exif_dict["GPS"] = MetadataWriter._build_gps_ifd(lat, lng)

        # ── ImageDescription (caption + music) ──────────
        description_parts = []
        caption = story_data.get("caption_text")
        if caption:
            description_parts.append(caption)

        music = story_data.get("music")
        if music:
            description_parts.append(
                f"🎵 {music.get('track_title', '')} — {music.get('artist_name', '')}"
            )

        location_name = story_data.get("location_name")
        if location_name:
            description_parts.append(f"📍 {location_name}")

        mentions = story_data.get("mentions", [])
        if mentions:
            mention_str = " ".join(f"@{m.get('username', '')}" for m in mentions)
            description_parts.append(f"👥 {mention_str}")

        if description_parts:
            desc = "\n".join(description_parts)
            exif_dict["0th"][piexif.ImageIFD.ImageDescription] = desc.encode("utf-8")

        # ── UserComment (Full MOM JSON) ─────────────────
        mom_json = MetadataWriter._build_mom_json(story_data)
        # piexif UserComment requires specific encoding prefix
        user_comment = b"UNICODE\x00" + json.dumps(mom_json, ensure_ascii=False).encode("utf-16le")
        exif_dict["Exif"][piexif.ExifIFD.UserComment] = user_comment

        # ── Software Tag ────────────────────────────────
        exif_dict["0th"][piexif.ImageIFD.Software] = b"MemWault v0.1.0"

        # ── Write back to file ──────────────────────────
        exif_bytes = piexif.dump(exif_dict)
        piexif.insert(exif_bytes, str(file_path))

        logger.info("EXIF metadata written to %s", file_path.name)

    # ── MP4 Metadata Writer ──────────────────────────────

    @staticmethod
    def _write_mp4_metadata(file_path: Path, story_data: dict):
        """
        Write metadata into an MP4 file by appending a custom
        `udta` (user data) box containing the MOM JSON.

        Also writes standard QuickTime metadata atoms:
        - ©nam: Title (caption)
        - ©ART: Artist (username)
        - ©des: Description (caption + music + location)
        - ©day: Creation date
        - ©xyz: GPS coordinates (ISO 6709)
        """
        mom_json = MetadataWriter._build_mom_json(story_data)
        json_bytes = json.dumps(mom_json, ensure_ascii=False).encode("utf-8")

        # Read original file
        original_data = file_path.read_bytes()

        # Build description text
        description_parts = []
        caption = story_data.get("caption_text")
        if caption:
            description_parts.append(caption)

        music = story_data.get("music")
        if music:
            description_parts.append(
                f"🎵 {music.get('track_title', '')} — {music.get('artist_name', '')}"
            )

        location_name = story_data.get("location_name")
        if location_name:
            description_parts.append(f"📍 {location_name}")

        mentions = story_data.get("mentions", [])
        if mentions:
            mention_str = " ".join(f"@{m.get('username', '')}" for m in mentions)
            description_parts.append(f"👥 {mention_str}")

        description = "\n".join(description_parts) if description_parts else "MemWault Archive"

        # Build QuickTime udta box with metadata
        udta_children = b""

        # ©des (description)
        udta_children += MetadataWriter._make_qt_text_atom(b"\xa9des", description)

        # ©day (creation date)
        taken_at = story_data.get("taken_at")
        if taken_at:
            if isinstance(taken_at, str):
                taken_at = datetime.fromisoformat(taken_at)
            udta_children += MetadataWriter._make_qt_text_atom(
                b"\xa9day", taken_at.strftime("%Y-%m-%dT%H:%M:%SZ")
            )

        # ©ART (artist/username)
        ig_user_id = story_data.get("ig_user_id", "")
        if ig_user_id:
            udta_children += MetadataWriter._make_qt_text_atom(b"\xa9ART", f"ig_user:{ig_user_id}")

        # ©xyz (GPS in ISO 6709 format: +DD.DDDD-DDD.DDDD/)
        lat = story_data.get("location_lat")
        lng = story_data.get("location_lng")
        if lat is not None and lng is not None:
            geo_str = f"{lat:+.4f}{lng:+.4f}/"
            udta_children += MetadataWriter._make_qt_text_atom(b"\xa9xyz", geo_str)

        # Custom MemWault JSON box (using 'sv.j' fourcc)
        sv_box = MetadataWriter._make_box(b"sv.j", json_bytes)
        udta_children += sv_box

        # Wrap in udta box
        udta_box = MetadataWriter._make_box(b"udta", udta_children)

        # Find the moov box and inject udta before closing it
        # Simple approach: append udta box to the end of the file
        # (Most players will still read it; for production, inject into moov)
        with open(file_path, "wb") as f:
            f.write(original_data)
            f.write(udta_box)

        logger.info("MP4 metadata written to %s (%d bytes JSON)", file_path.name, len(json_bytes))

    # ── Helpers ──────────────────────────────────────────

    @staticmethod
    def _build_mom_json(story_data: dict) -> dict:
        """
        Build the complete MOM JSON schema that gets embedded
        into file headers.
        """
        result = {
            "memwault_version": "0.1.0",
            "ig_media_id": story_data.get("ig_media_id"),
            "ig_media_pk": story_data.get("ig_media_pk"),
            "ig_user_id": story_data.get("ig_user_id"),
            "media_type": "video" if story_data.get("media_type") == 2 else "photo",
        }

        # Timestamps
        taken_at = story_data.get("taken_at")
        if taken_at:
            if isinstance(taken_at, datetime):
                taken_at = taken_at.isoformat()
            result["taken_at"] = taken_at

        # Location
        if story_data.get("location_name"):
            result["location"] = {
                "name": story_data["location_name"],
                "lat": story_data.get("location_lat"),
                "lng": story_data.get("location_lng"),
                "ig_location_id": story_data.get("location_id"),
            }

        # Music
        if story_data.get("music"):
            m = story_data["music"]
            result["music"] = {
                "track_title": m.get("track_title"),
                "artist_name": m.get("artist_name"),
                "ig_audio_id": m.get("ig_audio_id"),
                "ig_audio_asset_id": m.get("ig_audio_asset_id"),
                "start_time_ms": m.get("start_time_ms"),
                "play_duration_ms": m.get("play_duration_ms"),
                "spotify_track_id": m.get("spotify_track_id"),
                "spotify_url": m.get("spotify_url"),
                "cover_art_url": m.get("cover_art_url"),
            }

        # Mentions
        if story_data.get("mentions"):
            result["mentions"] = [
                {
                    "username": m.get("username"),
                    "ig_user_id": m.get("ig_user_id"),
                    "x": m.get("x"),
                    "y": m.get("y"),
                }
                for m in story_data["mentions"]
            ]

        # Stickers
        if story_data.get("stickers"):
            result["stickers"] = story_data["stickers"]

        # Links
        if story_data.get("links"):
            result["links"] = [
                {
                    "url": l.get("url"),
                    "title": l.get("link_title"),
                }
                for l in story_data["links"]
            ]

        # Polls
        if story_data.get("polls"):
            result["polls"] = story_data["polls"]

        # Manifest
        if story_data.get("manifest"):
            result["manifest"] = story_data["manifest"]

        return result

    @staticmethod
    def _build_gps_ifd(lat: float, lng: float) -> dict:
        """
        Build piexif GPS IFD dictionary from decimal coordinates.
        """
        def _decimal_to_dms(decimal: float):
            d = int(decimal)
            m = int((decimal - d) * 60)
            s = round((decimal - d - m / 60) * 3600 * 10000)
            return ((abs(d), 1), (abs(m), 1), (abs(s), 10000))

        lat_ref = b"N" if lat >= 0 else b"S"
        lng_ref = b"E" if lng >= 0 else b"W"

        return {
            piexif.GPSIFD.GPSLatitudeRef: lat_ref,
            piexif.GPSIFD.GPSLatitude: _decimal_to_dms(abs(lat)),
            piexif.GPSIFD.GPSLongitudeRef: lng_ref,
            piexif.GPSIFD.GPSLongitude: _decimal_to_dms(abs(lng)),
        }

    @staticmethod
    def _make_box(fourcc: bytes, data: bytes) -> bytes:
        """Build an MP4 box (atom) with the given fourcc and data."""
        size = 8 + len(data)
        return struct.pack(">I", size) + fourcc + data

    @staticmethod
    def _make_qt_text_atom(fourcc: bytes, text: str) -> bytes:
        """Build a QuickTime text metadata atom."""
        encoded = text.encode("utf-8")
        # QuickTime text atom: 2 bytes text length + 2 bytes language code + text
        text_data = struct.pack(">HH", len(encoded), 0) + encoded
        return MetadataWriter._make_box(fourcc, text_data)
