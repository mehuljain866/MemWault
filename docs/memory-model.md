# MemWault — Memory Object Model (MOM)

MemWault models a **Story** as a structured domain entity rather than a simple media file.

---

## 🏛️ Domain Architecture

A single archived memory preserves the file alongside its temporal, spatial, compositional, social, engagement, and archival context:

```text
Memory Object Model (MOM)
├── Original Media Asset    (Original .jpg photo or .mp4 video)
├── Temporal Context       (Story taken_at timestamp in UTC)
├── Caption & Text Content (Raw caption & text sticker content)
├── Composition Manifest   (Visual layout state, sticker positioning & layer composition)
├── Spatial Context        (Venue name, latitude, longitude coordinates)
├── Social Context         (Tagged user mentions, author metadata)
├── Historical Engagement  (Viewer Count & Story Like Count at archival time)
├── Personal Annotation    (Human-authored Markdown .md sidecar file)
└── Collection Membership  (Highlight Album relations & cover position)
```

---

## 🔍 Data Provenance & Source Authority

Every attribute in a MemWault memory object is mapped to its exact origination source and authority model:

| Data Attribute | Origination Source | Capture & Processing Method | Authority Model |
| :--- | :--- | :--- | :--- |
| **Original Media Asset** | Instagram CDN | Direct binary download (`.jpg` / `.mp4`) | Source Immutable |
| **Story Timestamp** | Instagram API | Extracted from story creation `taken_at` timestamp | Source Authoritative |
| **Caption & Text Content** | Story Sticker Payload | Extracted from raw text sticker JSON manifest | Source Authoritative |
| **Composition Manifest** | Story Sticker Payload | Parsed sticker dimensions, coordinates, & angles | Source Authoritative |
| **Spatial Geolocation** | Instagram Venue API | Extracted location sticker name & GPS coordinates | Source Authoritative |
| **Music Track Metadata** | Instagram / iTunes API | Extracted track details + optional external 30s preview reference | Hybrid / Enriched |
| **Engagement Metrics** | Instagram API | Snapshot of `viewer_count` & `like_count` captured at archival time | Temporal Snapshot |
| **Sidecar Journal Notes** | Local User | Authored in MemWault & saved as `.md` sidecar on disk | User Authoritative |
| **EXIF / XMP Tags** | Local Metadata Engine | Embedded into media header by MemWault ExifTool engine | Derived Archival Unit |
| **Highlight Memberships** | Local Database | User-curated local album groupings | User Authoritative |

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
