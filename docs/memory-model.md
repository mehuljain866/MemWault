# MemWault — Memory Object Model (MOM)

MemWault models a **Story** as a structured domain entity rather than a simple media file.

---

## 🏛️ Domain Architecture

A single archived memory preserves the file alongside its temporal, spatial, compositional, social, engagement, and archival context:

```text
Memory Object Model (MOM)
├── Original Media Asset    (Original .jpg photo or .mp4 video)
├── Temporal Context       (Story taken_at timestamp in UTC)
├── Spatial Context        (Venue name, latitude, longitude coordinates)
├── Compositional Context  (Caption text, stickers, poll choices, layout manifest)
├── Social Context         (Tagged user mentions, author metadata)
├── Historical Engagement  (Viewer Count & Story Like Count at archival time)
├── Personal Annotation    (Human-authored Markdown .md sidecar file)
└── Collection Membership  (Highlight Album relations & cover position)
```

---

## 📊 Relational Database Schema (`Story`)

```sql
CREATE TABLE stories (
    id VARCHAR PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    media_url VARCHAR NOT NULL,
    media_type VARCHAR NOT NULL, -- 'photo' | 'video'
    taken_at TIMESTAMP WITH TIME ZONE NOT NULL,
    caption_text TEXT,
    location_name VARCHAR,
    latitude FLOAT,
    longitude FLOAT,
    music_title VARCHAR,
    music_artist VARCHAR,
    music_preview_url VARCHAR,
    viewer_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    is_reel_repost BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📝 Portable Sidecar Format

When a journal note is edited in MemWault, it is automatically written as a human-readable Markdown file right next to the media file on disk:

```text
media/<user_id>/2026/07/
├── story_1786600791480.jpg
└── story_1786600791480.md
```
