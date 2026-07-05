"""
MemWault Instagram Scraper
Wraps the instagrapi library to fetch stories, parse metadata,
and extract the full Memory Object Model (MOM) data.
"""

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from instagrapi import Client as InstaClient
from instagrapi.types import Story as IGStory

logger = logging.getLogger("memwault.scraper")


class InstagramScraper:
    """
    Instagram API client wrapper for MemWault.
    Handles authentication, story fetching, media downloading,
    and metadata extraction.
    """

    def __init__(
        self,
        username: str = "",
        password: Optional[str] = None,
        sessionid: Optional[str] = None,
        web_cookies: Optional[dict] = None,
        web_user_agent: Optional[str] = None,
        session_data: Optional[dict] = None,
        device_settings: Optional[dict] = None,
    ):
        self._client = None  # Lazy — never created for web cookie path
        self.username = username
        self.password = password
        self.sessionid = sessionid
        self.web_cookies = web_cookies  # Full cookie dict from browser login
        self.web_user_agent = web_user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        )
        self._is_logged_in = False
        self._device_settings = device_settings

        # Restore session from saved cookies if available
        if session_data:
            if "web_cookies" in session_data:
                self.web_cookies = session_data["web_cookies"]
                self.web_user_agent = session_data.get("web_user_agent", self.web_user_agent)
                self.sessionid = self.web_cookies.get("sessionid")
                self._is_logged_in = True
                logger.info("Restored full web session for %s", username)
            elif "web_sessionid" in session_data:
                self.sessionid = session_data["web_sessionid"]
                self._is_logged_in = True
                logger.info("Restored legacy web session for %s", username)
            else:
                try:
                    self.client.set_settings(session_data)
                    self.client.login(username, password)
                    self._is_logged_in = True
                    logger.info("Restored session for %s", username)
                except Exception as e:
                    logger.warning("Session restore failed for %s: %s", username, e)
                    self._is_logged_in = False

    def _init_client(self):
        """Lazily create the instagrapi Client (only for password-based login)."""
        if self._client is None:
            self._client = InstaClient()
            if self._device_settings:
                self._client.set_device(self._device_settings)
        return self._client

    @property
    def client(self):
        """Access the instagrapi client, creating it on demand."""
        return self._init_client()

    # ── Authentication ───────────────────────────────────

    def login(self) -> dict:
        """
        Log in to Instagram and return session data for caching.
        Returns the full session dict to store in the database.
        """
        if self.web_cookies:
            # Full browser cookie login — best method
            self._is_logged_in = True
            logger.info("Logged in as %s via full browser cookies", self.username)
            return {
                "web_cookies": self.web_cookies,
                "web_user_agent": self.web_user_agent,
            }

        if self.sessionid:
            # Legacy single-cookie bypass
            self._is_logged_in = True
            logger.info("Logged in as %s via web sessionid", self.username)
            return {"web_sessionid": self.sessionid}

        if not self.username or not self.password:
            raise ValueError("Instagram credentials or sessionid not configured")

        self.client.login(self.username, self.password)
        self._is_logged_in = True
        logger.info("Logged in as %s (user_id: %s)", self.username, self.client.user_id)
        return self.get_session_data()

    def get_session_data(self) -> dict:
        """Export current session cookies and settings for database storage."""
        if self.web_cookies:
            return {"web_cookies": self.web_cookies, "web_user_agent": self.web_user_agent}
        if self.sessionid:
            return {"web_sessionid": self.sessionid}
        return self.client.get_settings()

    def get_device_settings(self) -> dict:
        """Export device fingerprint settings."""
        if self.web_cookies or self.sessionid:
            return {"user_agent": self.web_user_agent, "device_settings": {}}
        settings = self.client.get_settings()
        return {
            "user_agent": settings.get("user_agent", ""),
            "device_settings": settings.get("device_settings", {}),
        }

    @property
    def user_id(self) -> str:
        if self.web_cookies:
            return self.web_cookies.get("ds_user_id", "").split("%3A")[0].split(":")[0]
        if self.sessionid:
            return self.sessionid.split("%3A")[0].split(":")[0]
        return str(self.client.user_id)

    @property
    def is_logged_in(self) -> bool:
        return self._is_logged_in

    # ── Story Fetching ───────────────────────────────────

    def _build_web_headers(self) -> dict:
        """Build request headers that mirror a real browser session."""
        headers = {
            "User-Agent": self.web_user_agent,
            "X-IG-App-ID": "936619743392459",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.instagram.com/",
            "Origin": "https://www.instagram.com",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
        }

        # Build cookie string from full cookie dict or fallback to sessionid
        if self.web_cookies:
            cookie_str = "; ".join(f"{k}={v}" for k, v in self.web_cookies.items())
            headers["Cookie"] = cookie_str
            # Add CSRF token as header (Instagram validates this)
            if "csrftoken" in self.web_cookies:
                headers["X-CSRFToken"] = self.web_cookies["csrftoken"]
        elif self.sessionid:
            headers["Cookie"] = f"sessionid={self.sessionid}"

        return headers

    def _web_fetch_stories(self, user_id: str) -> list[dict]:
        import requests
        url = f"https://www.instagram.com/api/v1/feed/reels_media/?reel_ids={user_id}"
        headers = self._build_web_headers()

        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            raise Exception(f"Web API returned {resp.status_code}: {resp.text[:100]}")
        
        data = resp.json()
        reels = data.get("reels", {})
        reel_data = reels.get(str(user_id), {})
        items = reel_data.get("items", [])
        
        stories = []
        for item in items:
            try:
                stories.append(self._parse_raw_story_dict(item))
            except Exception as e:
                logger.warning("Failed to parse web story: %s", e)
        
        logger.info("Fetched %d active stories for user %s via Web API", len(stories), user_id)
        return stories

    def fetch_own_stories(self) -> list[dict]:
        """
        Fetch the authenticated user's currently active stories.
        Returns a list of parsed story dicts ready for database insertion.
        """
        if self.web_cookies or self.sessionid:
            return self._web_fetch_stories(self.user_id)

        self._ensure_logged_in()
        user_id = self.client.user_id

        raw_stories: list[IGStory] = self.client.user_stories(user_id)
        logger.info("Fetched %d active stories for user %s", len(raw_stories), user_id)

        return [self._parse_story(s) for s in raw_stories]

    def fetch_user_stories(self, target_user_id: str) -> list[dict]:
        """
        Fetch active stories for a specific user (must be followed if private).
        """
        self._ensure_logged_in()
        raw_stories: list[IGStory] = self.client.user_stories(int(target_user_id))
        logger.info("Fetched %d stories for user %s", len(raw_stories), target_user_id)
        return [self._parse_story(s) for s in raw_stories]

    def fetch_story_viewers(self, media_id: str) -> list[dict]:
        """
        Fetch the list of users who viewed a specific story.
        Must be called before the story expires (24h window).
        """
        self._ensure_logged_in()
        viewers = self.client.story_viewers(media_id)
        return [
            {
                "ig_user_id": str(v.pk),
                "username": v.username,
                "full_name": v.full_name,
                "profile_pic_url": str(v.profile_pic_url) if v.profile_pic_url else None,
            }
            for v in viewers
        ]

    def fetch_archive_stories(self, max_stories: Optional[int] = None) -> list[dict]:
        """
        Fetch historical stories from the authenticated user's story archive.
        This retrieves ALL past stories, not just the active 24h window.
        """
        self._ensure_logged_in()

        # instagrapi doesn't have a direct archive method, but we can use
        # the private API endpoint directly
        try:
            stories = []
            result = self.client.private_request(
                "archive/reel/day_shells/",
                params={"include_cover": "0"},
            )

            # Each "day shell" contains story items for that day
            items = result.get("items", [])
            for day_shell in items:
                day_items = day_shell.get("items", [])
                for item_data in day_items:
                    try:
                        parsed = self._parse_raw_story_dict(item_data)
                        stories.append(parsed)
                        if max_stories and len(stories) >= max_stories:
                            return stories
                    except Exception as e:
                        logger.warning("Failed to parse archive story: %s", e)
                        continue

            logger.info("Fetched %d stories from archive", len(stories))
            return stories

        except Exception as e:
            logger.error("Archive fetch failed: %s", e)
            raise

    # ── Media Download ───────────────────────────────────

    def download_story_media(
        self,
        story_data: dict,
        download_dir: Path,
    ) -> Optional[Path]:
        """
        Download the compressed story media (photo or video) from Instagram's CDN.
        Returns the local file path of the downloaded file.
        File is named using the V-1 suffix convention:
            story_[YYYY-MM-DD]_[STORY_ID] (Compressed).[ext]
        """
        cdn_url = story_data.get("cdn_url")
        if not cdn_url:
            logger.warning("No CDN URL for story %s", story_data.get("ig_media_id"))
            return None

        download_dir.mkdir(parents=True, exist_ok=True)

        # Determine file extension
        media_type = story_data.get("media_type", 1)
        ext = "mp4" if media_type == 2 else "jpg"

        # Build V-1 filename: story_2026-07-01_18392049283 (Compressed).mp4
        taken_at = story_data.get("taken_at", datetime.now(timezone.utc))
        if isinstance(taken_at, str):
            taken_at = datetime.fromisoformat(taken_at)
        date_str = taken_at.strftime("%Y-%m-%d")
        media_id = story_data.get("ig_media_id", "unknown")
        file_name = f"story_{date_str}_{media_id} (Compressed).{ext}"

        file_path = download_dir / file_name

        # Use instagrapi's built-in downloader or httpx
        import httpx

        try:
            with httpx.stream("GET", cdn_url, follow_redirects=True, timeout=60) as resp:
                resp.raise_for_status()
                with open(file_path, "wb") as f:
                    for chunk in resp.iter_bytes(chunk_size=8192):
                        f.write(chunk)

            logger.info("Downloaded: %s (%.1f KB)", file_name, file_path.stat().st_size / 1024)
            return file_path

        except Exception as e:
            logger.error("Download failed for %s: %s", media_id, e)
            return None

    # ── Highlights ───────────────────────────────────────

    def fetch_highlights(self, target_user_id: Optional[str] = None) -> list[dict]:
        """
        Fetch all highlight reels for a user.
        If target_user_id is None, fetches own highlights.
        """
        self._ensure_logged_in()
        uid = int(target_user_id) if target_user_id else self.client.user_id

        highlights = self.client.user_highlights(uid)
        result = []

        for hl in highlights:
            hl_info = self.client.highlight_info(hl.pk)
            for item in hl_info.items:
                parsed = self._parse_story(item)
                parsed["highlight_title"] = hl.title
                parsed["highlight_id"] = str(hl.pk)
                result.append(parsed)

        logger.info("Fetched %d stories from %d highlights", len(result), len(highlights))
        return result

    # ── Internal Parsers ─────────────────────────────────

    def _parse_story(self, story: IGStory) -> dict:
        """
        Parse an instagrapi Story object into a flat dictionary
        matching the MemWault MOM schema.
        """
        # Determine CDN URL for the best quality version
        cdn_url = None
        if story.video_url:
            cdn_url = str(story.video_url)
        elif story.thumbnail_url:
            cdn_url = str(story.thumbnail_url)

        # Media type: 1=photo, 2=video
        media_type = 2 if story.video_url else 1

        parsed = {
            "ig_media_id": story.id,
            "ig_media_pk": str(story.pk),
            "ig_user_id": str(story.user.pk) if story.user else None,
            "taken_at": story.taken_at,
            "expires_at": getattr(story, "expiring_at", None),
            "media_type": media_type,
            "cdn_url": cdn_url,
            "width": getattr(story, "original_width", None) or 1080,
            "height": getattr(story, "original_height", None) or 1920,
            "duration_ms": int(story.video_duration * 1000) if story.video_duration else None,
            "caption_text": story.caption_text if hasattr(story, "caption_text") else None,
            "music": None,
            "mentions": [],
            "stickers": [],
            "links": [],
            "polls": [],
            "location_name": None,
            "location_lat": None,
            "location_lng": None,
            "location_id": None,
            "manifest": {},  # Will be populated from sticker coordinates
        }

        # ── Location ────────────────────────────────────
        if hasattr(story, "location") and story.location:
            loc = story.location
            parsed["location_name"] = getattr(loc, "name", None)
            parsed["location_lat"] = getattr(loc, "lat", None)
            parsed["location_lng"] = getattr(loc, "lng", None)
            parsed["location_id"] = str(getattr(loc, "pk", ""))

        # ── Mentions ────────────────────────────────────
        if hasattr(story, "mentions") and story.mentions:
            for mention in story.mentions:
                parsed["mentions"].append({
                    "username": mention.user.username if mention.user else str(mention),
                    "ig_user_id": str(mention.user.pk) if mention.user else None,
                    "x": getattr(mention, "x", None),
                    "y": getattr(mention, "y", None),
                    "width": getattr(mention, "width", None),
                    "height": getattr(mention, "height", None),
                    "rotation": getattr(mention, "rotation", None),
                })

        # ── Story Stickers (hashtags, locations, etc.) ──
        if hasattr(story, "sticker_items") and story.sticker_items:
            for sticker in story.sticker_items:
                sticker_data = {
                    "sticker_type": getattr(sticker, "type", "unknown"),
                    "sticker_data": {},
                    "x": getattr(sticker, "x", None),
                    "y": getattr(sticker, "y", None),
                    "width": getattr(sticker, "width", None),
                    "height": getattr(sticker, "height", None),
                    "rotation": getattr(sticker, "rotation", None),
                    "z_index": getattr(sticker, "z", None),
                }

                # Extract type-specific data
                if hasattr(sticker, "hashtag") and sticker.hashtag:
                    sticker_data["sticker_type"] = "hashtag"
                    sticker_data["sticker_data"]["hashtag"] = sticker.hashtag.name

                if hasattr(sticker, "location") and sticker.location:
                    sticker_data["sticker_type"] = "location"
                    sticker_data["sticker_data"]["location_name"] = sticker.location.name

                parsed["stickers"].append(sticker_data)

        # ── Music ───────────────────────────────────────
        # Music data is embedded in the story's raw API response
        # instagrapi exposes it via story_music_stickers or similar
        raw = {}
        if hasattr(story, "model_dump"):
            try:
                raw = story.model_dump()
            except Exception:
                pass

        # Check for music sticker in the raw model
        music_info = self._extract_music_from_raw(raw)
        if music_info:
            parsed["music"] = music_info

        # ── Links ───────────────────────────────────────
        if hasattr(story, "links") and story.links:
            for link in story.links:
                parsed["links"].append({
                    "url": link.webUri if hasattr(link, "webUri") else str(link),
                    "display_url": getattr(link, "link_title", None),
                    "link_title": getattr(link, "link_title", None),
                })

        # ── Build Manifest ──────────────────────────────
        parsed["manifest"] = self._build_manifest(parsed)

        return parsed

    def _parse_raw_story_dict(self, item: dict) -> dict:
        """
        Parse a raw Instagram API response dict (from archive endpoint)
        into the MemWault MOM format.
        """
        # Determine CDN URL
        cdn_url = None
        media_type = item.get("media_type", 1)

        if media_type == 2:  # Video
            video_versions = item.get("video_versions") or []
            if video_versions:
                cdn_url = video_versions[0].get("url")
        else:  # Photo
            image_versions = item.get("image_versions2") or {}
            candidates = image_versions.get("candidates") or []
            if candidates:
                cdn_url = candidates[0].get("url")

        taken_at_ts = item.get("taken_at", 0)
        taken_at = datetime.fromtimestamp(taken_at_ts, tz=timezone.utc)

        parsed = {
            "ig_media_id": item.get("id", ""),
            "ig_media_pk": str(item.get("pk", "")),
            "ig_user_id": str((item.get("user") or {}).get("pk", "")),
            "taken_at": taken_at,
            "expires_at": None,
            "media_type": media_type,
            "cdn_url": cdn_url,
            "width": item.get("original_width", 1080),
            "height": item.get("original_height", 1920),
            "duration_ms": int(item.get("video_duration", 0) * 1000) if item.get("video_duration") else None,
            "caption_text": None,
            "music": None,
            "mentions": [],
            "stickers": [],
            "links": [],
            "polls": [],
            "location_name": None,
            "location_lat": None,
            "location_lng": None,
            "location_id": None,
            "manifest": {},
        }

        # ── Location ────────────────────────────────────
        location = item.get("location")
        if location:
            parsed["location_name"] = location.get("name")
            parsed["location_lat"] = location.get("lat")
            parsed["location_lng"] = location.get("lng")
            parsed["location_id"] = str(location.get("pk", ""))

        # ── Reel Mentions ───────────────────────────────
        reel_mentions = item.get("reel_mentions") or []
        for mention in reel_mentions:
            user = mention.get("user") or {}
            parsed["mentions"].append({
                "username": user.get("username", ""),
                "ig_user_id": str(user.get("pk", "")),
                "x": mention.get("x"),
                "y": mention.get("y"),
                "width": mention.get("width"),
                "height": mention.get("height"),
                "rotation": mention.get("rotation"),
            })

        # ── Story Sticker Items ─────────────────────────
        creative_config = item.get("creative_config") or {}
        sticker_items = (item.get("story_sticker_items") or []) or (creative_config.get("sticker_items") or [])
        for sticker in sticker_items:
            parsed["stickers"].append({
                "sticker_type": sticker.get("type", "unknown"),
                "sticker_data": sticker,
                "x": sticker.get("x"),
                "y": sticker.get("y"),
                "width": sticker.get("width"),
                "height": sticker.get("height"),
                "rotation": sticker.get("rotation"),
                "z_index": sticker.get("z"),
            })

        # ── Music ───────────────────────────────────────
        music_info = self._extract_music_from_raw(item)
        if music_info:
            parsed["music"] = music_info

        # ── Links ───────────────────────────────────────
        story_cta = item.get("story_cta") or []
        for cta in story_cta:
            links = cta.get("links") or []
            for link in links:
                parsed["links"].append({
                    "url": link.get("webUri", ""),
                    "display_url": link.get("linkTitle", ""),
                    "link_title": link.get("linkTitle", ""),
                })

        # ── Polls / Quizzes ─────────────────────────────
        # Story polls
        poll_sticker = item.get("story_polls") or []
        for poll in poll_sticker:
            poll_data = poll.get("poll_sticker") or {}
            tallies = poll_data.get("tallies") or []
            parsed["polls"].append({
                "poll_type": "poll",
                "question_text": poll_data.get("question", ""),
                "options": [
                    {
                        "text": t.get("text", ""),
                        "count": t.get("count", 0),
                        "font_size": t.get("font_size"),
                    }
                    for t in tallies
                ],
                "total_votes": sum(t.get("count", 0) for t in tallies),
            })

        # Story quizzes
        quiz_sticker = item.get("story_quizs") or []
        for quiz in quiz_sticker:
            quiz_data = quiz.get("quiz_sticker") or {}
            parsed["polls"].append({
                "poll_type": "quiz",
                "question_text": quiz_data.get("question", ""),
                "options": [
                    {
                        "text": t.get("text", ""),
                        "count": t.get("count", 0),
                        "is_correct": t.get("is_correct", False),
                    }
                    for t in quiz_data.get("tallies", [])
                ],
                "total_votes": sum(t.get("count", 0) for t in quiz_data.get("tallies", [])),
            })

        # Build manifest
        parsed["manifest"] = self._build_manifest(parsed)

        return parsed

    def _extract_music_from_raw(self, raw: dict) -> Optional[dict]:
        """
        Extract music metadata from the raw Instagram API response.
        Checks multiple possible locations for music sticker data.
        """
        # Check story_music_stickers
        music_stickers = raw.get("story_music_stickers", [])
        if not music_stickers:
            # Try alternative paths
            sticker_items = raw.get("story_sticker_items", [])
            for item in sticker_items:
                if item.get("type") == "music":
                    music_stickers = [item]
                    break

        if not music_stickers:
            return None

        music_sticker = music_stickers[0]
        music_data = music_sticker.get("music_asset_info", {}) or music_sticker.get("music_info", {})

        if not music_data:
            return None

        return {
            "track_title": music_data.get("title", "Unknown"),
            "artist_name": music_data.get("display_artist", "") or music_data.get("artist_name", "Unknown"),
            "ig_audio_id": str(music_data.get("audio_id", "")),
            "ig_audio_asset_id": str(music_data.get("audio_asset_id", "")),
            "start_time_ms": music_data.get("start_time_in_ms") or music_data.get("clip_start_time_in_ms"),
            "play_duration_ms": music_data.get("playback_duration_in_ms") or music_data.get("overlap_duration_in_ms"),
            "cover_art_url": music_data.get("cover_artwork_uri") or music_data.get("cover_artwork_thumbnail_uri"),
            "x": music_sticker.get("x"),
            "y": music_sticker.get("y"),
            "width": music_sticker.get("width"),
            "height": music_sticker.get("height"),
            "rotation": music_sticker.get("rotation"),
        }

    def _build_manifest(self, parsed: dict) -> dict:
        """
        Build the .mem manifest.json structure from parsed story data.
        This is the layout "recipe" for reconstructive replay.
        """
        layers = []

        # Background layer (the main media)
        layers.append({
            "type": "video" if parsed["media_type"] == 2 else "image",
            "source": "final/",
            "transform": {"x": 0, "y": 0, "scale": 1.0, "rotation": 0},
        })

        # Mention layers
        for mention in parsed.get("mentions", []):
            layers.append({
                "type": "mention",
                "username": mention.get("username", ""),
                "user_id": mention.get("ig_user_id"),
                "transform": {
                    "x": mention.get("x", 0),
                    "y": mention.get("y", 0),
                    "width": mention.get("width"),
                    "height": mention.get("height"),
                    "rotation": mention.get("rotation", 0),
                },
            })

        # Sticker layers
        for sticker in parsed.get("stickers", []):
            layers.append({
                "type": "sticker",
                "sticker_type": sticker.get("sticker_type", "unknown"),
                "data": sticker.get("sticker_data"),
                "transform": {
                    "x": sticker.get("x", 0),
                    "y": sticker.get("y", 0),
                    "width": sticker.get("width"),
                    "height": sticker.get("height"),
                    "rotation": sticker.get("rotation", 0),
                    "z_index": sticker.get("z_index"),
                },
            })

        manifest = {
            "version": 1.0,
            "canvas": {
                "width": parsed.get("width", 1080),
                "height": parsed.get("height", 1920),
            },
            "timeline": {
                "duration_ms": parsed.get("duration_ms"),
            },
            "layers": layers,
        }

        # Add music to timeline
        if parsed.get("music"):
            manifest["timeline"]["music"] = {
                "track_title": parsed["music"].get("track_title"),
                "artist_name": parsed["music"].get("artist_name"),
                "ig_audio_id": parsed["music"].get("ig_audio_id"),
                "start_time_ms": parsed["music"].get("start_time_ms"),
                "play_duration_ms": parsed["music"].get("play_duration_ms"),
            }

        return manifest

    # ── Utilities ────────────────────────────────────────

    def _ensure_logged_in(self):
        if not self._is_logged_in:
            raise RuntimeError("Not logged in. Call login() first.")
