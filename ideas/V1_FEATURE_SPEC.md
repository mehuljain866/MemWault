# MemWault — V1 Feature Specification

> **Mission:** Prevent data loss and memory loss by allowing users to permanently own, preserve, and replay their Instagram Stories independently of Instagram.

---

## Core Philosophy

MemWault V1 is a **memory preservation layer**, not a social media tool. The focus is on **reliable archiving, private journaling, and memory ownership**. AI features, advanced analytics, and social features are intentionally excluded from V1 to keep the scope tight and the product trustworthy.

---

## I. Authentication & Instagram Connection

### MemWault Account
- Local username/password registration (bcrypt hashed, JWT tokens)
- Session persistence via localStorage

### Instagram Connection
- **Primary method:** Browser `sessionid` cookie (bypasses IP blocks and mobile API bans)
- **Fallback method:** Username/password login via instagrapi (when not IP-blocked)
- Session data stored encrypted in the database for future polling
- Support for connecting multiple Instagram accounts (future consideration)

### Security Notes
- Users are **strongly advised to use a burner/secondary Instagram account** for the connection
- The connected account must follow any private profiles the user wants to archive
- MemWault never stores raw Instagram passwords after the initial login exchange

---

## II. Memory Model (What Gets Archived)

Each archived story becomes a **Memory** — a rich object containing:

### A. Archived Instagram Story
- The **compressed story** as downloaded from Instagram's CDN (photo `.jpg` or video `.mp4`)
- V1 archives the compressed version only; original/uncompressed media retrieval on non-rooted devices is not reliable enough
- Users can **manually attach the original photo or video** if they have it

### B. Story Metadata
- `ig_media_id`, `ig_media_pk`, `ig_user_id`
- `taken_at` timestamp (with timezone)
- `expires_at` (24-hour window)
- `media_type` (photo/video)
- `width`, `height`, `duration_ms`
- CDN URL (for re-download if needed)
- Caption text (if any)
- GPS coordinates / location data
- Device and filter information (where available)

### C. Relationships (Social Context)
All social context associated with a memory, grouped together:
- **Tagged users** — accounts tagged in the story
- **Mentioned users** — @mentions in text/stickers
- **Original creator** — for reposted/reshared stories
- **Reposted/shared-from information** — chain of sharing
- **Story links** — external URLs attached via link stickers
- Other relationship metadata where available

### D. Private Journal / Notes Layer
- **Personal, editable notes** attached to each memory
- These notes are **NOT part of the original story metadata** and never modify or overwrite the archived story
- The archived memory remains historically accurate; the journal layer remains editable over time
- Use cases: "First time trying astrophotography", "This was taken right after graduation", "The song was stuck in my head all week"
- Notes support plain text (rich text/markdown in future versions)

### E. Music Metadata
- Song title, artist name
- Start/end timestamps within the story
- Album art URL (where available)
- Audio fingerprint data (future)

### F. Interactive Elements (Static Snapshots)
- Poll results (final verdict, not re-functionalizable)
- Question/answer sticker content
- Quiz results
- Emoji slider values
- Countdown sticker data

### G. Timeline Placement
- Chronological position in the user's memory timeline
- Grouping by date, week, month
- Story sequence ordering (when multiple stories posted same day)

### H. Export Options
- Download as original media file
- Export as `.mem` package (see Section VI)
- Export metadata as JSON
- Bulk export support

---

## III. User Interface — Timeline-First Design

The UI centers on a **timeline of memories**, not a traditional dashboard. The dashboard exists only as a lightweight stats summary.

### Timeline View (Primary)
- Chronological feed of archived memories
- Each memory card shows: thumbnail, date, metadata badges (music, location, mentions)
- Filter by: date range, media type, has music, has location
- Infinite scroll with pagination

### Memory Detail View
- Full-size media viewer (photo/video playback)
- Tabbed sections:
  - **Story** — the archived media
  - **Metadata** — all captured metadata in a readable format
  - **Relationships** — tagged users, mentions, reposts, links
  - **Journal** — private notes (add/edit/delete)
  - **Export** — download options
- Edit journal notes inline

### Settings
- Instagram connection management
- **Sync interval configuration** (see Section IV)
- Account management (logout)
- Scrape history / activity log

---

## IV. Sync & Polling Strategy

### Default Behavior
- Default sync interval: **every 6–12 hours** (NOT every 15 minutes)
- Stories remain available for 24 hours, so 6–12 hour checks safely capture everything before expiry
- Aggressive polling (e.g., every 15 minutes) is avoided to reduce risk of account flagging

### Manual Sync
- A prominent **"Sync Now"** button is always available
- Allows users to trigger an immediate archive whenever they want
- Useful when the user knows they just posted a story and want it archived right away

### User-Configurable Interval
- Settings page includes a dropdown/slider for sync frequency:
  - Manual only
  - Every 1 hour
  - Every 3 hours
  - Every 6 hours (recommended)
  - Every 12 hours
  - Every 24 hours
- The chosen interval is stored in the database per-user

### Sync Logging
- Every sync attempt is logged with: timestamp, status (success/error), stories found, stories newly archived
- Viewable in Settings under "Scrape History"

---

## V. The `.mem` Format

The `.mem` container continues to be developed but **does not depend on original RAW files**.

### Structure
- ZIP-based, platform-agnostic container
- Contains:
  - Compressed story media (always present)
  - Original media (if manually attached by user or auto-retrieved)
  - `manifest.json` — the creative "recipe" (positions, fonts, colors, rotations, layer order of stickers/text)
  - `metadata.json` — full MOM metadata
  - `journal.json` — private notes
  - `relationships.json` — social context
  - Additional manually-attached assets (extra photos, videos, related files)

### What Each `.mem` Preserves
- GPS coordinates / location
- Story metadata (all fields)
- Private journal notes
- Timeline information
- Relationships (social context)
- Attached original media (manual or automatic)
- Music metadata

---

## VI. Cross-Platform Compatibility

The system targets maximum cross-platform reach:

### Supported Platforms
- **Web (PWA):** Primary interface — works on Android, iOS, Windows, macOS, Linux via browser
- **Desktop:** Accessible via any modern browser

### Metadata Portability
- Exported files use standard formats (JPEG, MP4, JSON, ZIP)
- Metadata format is open and extensible for future community contributions
- Native gallery integration targets (future):
  - Samsung Gallery
  - Google Photos
  - Apple Photos

### Data Format Standards
- XMP metadata namespaces for photo files
- MP4 atom injection for video metadata
- Open JSON schemas for all structured data

---

## VII. What V1 Explicitly EXCLUDES

These features are intentionally deferred to keep V1 focused:

- ❌ AI-powered features (auto-summaries, semantic search, auto-tagging)
- ❌ Face clustering / recognition
- ❌ OCR text extraction
- ❌ Original uncompressed media auto-retrieval (unreliable on non-rooted devices)
- ❌ Story replay/reconstruction engine
- ❌ Post-hoc editing (PSD-like layer editing)
- ❌ Social features / sharing
- ❌ SaaS/cloud hosting (Pixel Labs)
- ❌ Multi-platform native apps (Android/iOS)
- ❌ Accessibility Service / Shizuku integration
- ❌ Network traffic inspection / Frida SSL pinning

---

## VIII. Tech Stack (V1)

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + Vite (PWA with service worker) |
| **Backend** | Python FastAPI (async) |
| **Database** | SQLite (local dev) / PostgreSQL (production) |
| **IG Scraper** | instagrapi (password login) + Instagram Web API (sessionid login) |
| **Storage** | Local filesystem (dev) / S3-compatible (production) |
| **Auth** | bcrypt + JWT |
| **Task Queue** | Celery (eager mode for local, Redis for production) |

---

## IX. Primary Objective (Unchanged)

> **Prevent data loss and memory loss by allowing users to permanently own, preserve, and replay their Instagram Stories independently of Instagram.**

Every feature decision in V1 serves this single goal. If a feature doesn't directly contribute to reliable archiving and memory preservation, it waits for a future version.
