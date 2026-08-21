# MemWault - Personal Memory Preservation & Archiving

<p align="center">
  <img src="screenshots/dashboard_home.jpg" alt="MemWault Main Dashboard" width="100%" style="border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

<p align="center">
  <b>MemWault is a private, self-hosted digital archive for preserving, organizing, and replaying personal social-media memories. It archives Instagram Stories, Reels, and their surrounding context—music, locations, tags, engagement metrics, and personal journals—into a searchable memory archive under your control.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v3.2-0A84FF?style=for-the-badge&logo=appstore&logoColor=white" alt="Version 3.2" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20Framer%20Motion-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="Frontend React 19" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Backend FastAPI" />
  <img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial-FF9500?style=for-the-badge" alt="PolyForm License" />
</p>

<p align="center">
  <b>Self-Hosted • Local-First • Progressive Web App (PWA)</b>
</p>

---

## Table of Contents

- [Features Overview](#features-overview)
- [Architecture & Data Model](#architecture--data-model)
- [Quick Start & Installation](#quick-start--installation)
- [Changelog & Evolution](#changelog--evolution)
  - [Repository Structure](#repository-structure)
  - [Quickstart & Development](#quickstart--development)
  - [Docker Setup](#docker-setup)
  - [Configuration](#configuration)
  - [Known Limitations](#known-limitations)
  - [Design Decisions](#design-decisions)
  - [License](#license)

---

## Why MemWault?

> **Social media is ephemeral. Your memories shouldn't be.**

Instagram stores the temporary interface around your memories, but it doesn't give you a permanent, independent memory archive with its full context preserved. MemWault exists to make that archive yours.

- 🔒 **Data Ownership & Portability:** Maintain an independent local copy of your memory history free from cloud lock-in.
- 📜 **Context Preservation:** Capture not just the photo or video, but the surrounding narrative—music, locations, tags, engagement, and personal journal notes.
- 🛡️ **Account Safety & Privacy:** Scraper workflows operate locally with rate limiting and deliberately avoid volatile endpoints to reduce account restriction risk.
- 🏛️ **Preservation Over Reinterpretation:** Media is stored in its authentic raw format, with metadata layered around it rather than altering the archived Story itself.

---

## Key Features

- 🔄 **Smart Media Segregation:** Automatically distinguishes between actual personal Stories, Carousels, and Video Posts as distinct archival classification problems.
- 📱 **Mobile QR Upload Portal:** Stream uncompressed full-resolution RAW photos, 4K videos, and custom wallpapers directly from your smartphone to your PC desktop vault via local Wi-Fi.
- 🖼️ **RAW Master Versioning:** Swap between compressed Instagram CDN copies and uncompressed RAW camera originals seamlessly.
- 📊 **Archived Engagement Metrics:** Preserve Story viewer counts and like counts captured at archival time alongside media and metadata.
- 📝 **Sidecar Markdown Journaling:** Write rich notes auto-synced as human-readable `.md` files right next to `photo.jpg` on disk so your thoughts are never trapped inside a database.
- 🎒 **Portable Metadata & EXIF:** Option to embed archival context directly into media files so memories remain meaningful even outside MemWault.
- 📅 **Continuous Semantic Zoom Timeline:** Transition smoothly between **Years**, **Months**, and **Days** views using Framer Motion spring-based animations.
- 🗺️ **Spatial Story Map:** Explore your memories geographically on an interactive Leaflet map featuring spatial clustering and bounding-box search.
- 🎨 **Custom Highlight Albums:** Group your local stories into custom albums with dynamic 4-image grid covers, video thumbnails, and local cover uploads.
- 🎵 **iTunes Music Integration:** Embedded mini-player streaming 30-second external audio preview references for songs attached to your stories.

---

## Engineering Highlights

- ⚡ **Asynchronous FastAPI Backend:** SQLAlchemy 2.0 ORM with async connection pooling (`aiosqlite` / `asyncpg`).
- 🔄 **Distributed Ingestion Pipeline:** Redis + Celery worker queue for periodic background polling.
- 💾 **Hybrid Media Abstraction:** Local filesystem storage with `.md` sidecars or S3-compatible object storage (MinIO / AWS S3).
- 🔑 **Separated Authentication Domains:** JWT-based MemWault application authentication and locally persisted Instagram browser sessions.
- 📱 **Persistent UI Navigation:** React Router 7 outlet composition preserves page state across route transitions.

---

## What MemWault Preserves

MemWault treats a Story as a **structured memory object** rather than a simple media file:

```text
Single Archived Memory Object
├── 📷 Original Media Asset (Original .jpg photo or .mp4 video)
├── ⏱️ Story Timestamp      (UTC creation timestamp)
├── 💬 Caption & Text Content (Raw caption & text sticker content)
├── 🎨 Composition Manifest  (Visual layout state, sticker positioning & layers)
├── 🎵 Music Track         (Song title, artist name, and optional external 30s preview reference)
├── 📍 Geolocation         (Named location venue & GPS coordinates)
├── 🏷️ User Mentions       (Tagged usernames)
├── 📈 Engagement Metrics  (Viewer Count & Story Like Count)
├── 📓 Sidecar Journal     (Human-authored Markdown .md file)
└── 🖼️ Highlight Metadata  (Album memberships & cover attributes)
```

---

## Themes & Visual Tour

MemWault is designed around the idea that an archive should be explored spatially and temporally—not simply browsed as a folder of files. To complement this, we've built a **Multi-Era Design Architecture** allowing you to explore your memories in the aesthetic of your choice.

Rather than cluttering this document with dozens of screenshots, we have dedicated showcase pages for each of our handcrafted UI themes. **Click on a theme below to view its complete visual tour:**

- 📱 [**iOS HIG (Modern) Theme**](docs/themes/iOS_HIG.md) - The default, highly polished modern interface built around Apple's Human Interface Guidelines.
- 🪟 [**Windows 98 Theme**](docs/themes/Win98.md) - A bit-for-bit recreation of the classic 1998 Microsoft Windows desktop environment, complete with active desktop gadgets and authentic property sheets.
- 💿 [**Y2K Theme**](docs/themes/Y2K.md) - Inspired by the turn of the millennium, featuring brushed metal textures and the optimistic tech-bubble aesthetic.
- 💧 [**Aqua Theme**](docs/themes/Aqua.md) - Inspired by early macOS X, featuring glossy buttons and pinstriped backgrounds.

*(All new features—including the new Post Tab, Mobile QR Uploads, and RAW replacement functionality—are highlighted in these dedicated showcases!)*

---

## Changelog & Evolution

### Version 3.2 — Windows 98 Design System Perfection & Interactive Assistant
- **Authentic Windows 98 Icon Library:** 18 handcrafted pixel-perfect SVG reproductions of authentic 16-color/256-color Windows 98 shortcuts (`MemWault.exe`, `FeedViewer.exe`, `Memories.exe`, `Journal.exe`, `StoryReels.exe`, `Collections.exe`, `WorldAtlas.exe`, `Cabinet.exe`, `Setup.exe`, `Display.exe`, `RecycleBin.exe`).
- **Desktop Icon Backdrop Boxes:** Dynamic toggle in Display Properties allowing 3D beveled silver backdrop boxes around desktop icons for high contrast and readability over any custom wallpaper.
- **Interactive MemWault Assistant (Clippy):** Nostalgic animated assistant in the bottom-right corner with search Q&A knowledge base, step-by-step guidance, collision avoidance, and direct navigation links.
- **Authentic Windows 98 Property Sheet Engine:** Continuous 3D tab strip, black legends, and compact vertical rhythm.
- **Halftone Dithered Segmented Controls:** System-wide Windows 98 3D sunken containers with authentic 2x2 halftone dither pattern and 1px pressed offset.
- **Windows 98 Notepad / DevStudio Syntax Code Viewer:** Built-in retro syntax-highlighted JSON viewer with line numbering and 1998 Microsoft Visual Studio color palette.
- **Categorized Dashboard & Widget Architecture:** Segregated Stories/Memories and Feed Posts/Carousels into clean, distinct groupboxes and desktop gadgets.
- **Official 1998 WAV Sound Suite:** Bundled bit-for-bit authentic 1998 WAV audio samples (Brian Eno startup sound, shutdown chord, navigation clicks) with zero boot delay.
- **Authentic Shutdown Modal:** 3D outset Windows 98 dialog with "It's now safe to turn off your computer" screen.
- **Multi-Service Music Integration:** Dynamic branded audio player integration supporting Spotify, Apple Music, YouTube Music, and Amazon Music.

### Version 3.1 — Mobile QR Wallpaper Portal & Performance Engine
- **Dynamic Mobile QR Wallpaper Portal:** Generate responsive QR codes for direct mobile-to-desktop photo upload with live camera previews.
- **60 FPS Hardware-Accelerated Desktop Widgets:** Pure matrix transforms for smooth, lag-free widget dragging across high-DPI displays.

### Version 3.0 — Era Design Engine & Active Desktop Paradigm
- **Windows 98 Desktop Paradigm:** Fully interactive Windows 98 desktop environment complete with Start Menu, Taskbar, Draggable Windows, CRT Monitor Preview, and authentic double-bevel borders.
- **Multi-Era Design Architecture:** Comprehensive support for modern iOS HIG, Tactile Skeuomorphism, Y2K Brushed Chrome, and Windows 98.

### Version 2.6 — Feed Posts, Carousels & RAW Master Archival
- **Instagram Feed Posts & Carousels:** Complete ingestion pipeline for multi-slide carousels, video posts, and full-resolution uncompressed master media.
- **RAW Master Versioning:** Swap between compressed Instagram CDN copies and uncompressed RAW camera originals seamlessly.

### Version 2.5 — Architecture, Data Model & Documentation Update
- **Memory Object Model (MOM):** Standardized domain entity modeling for Stories, modeling them as rich multi-context memory objects.
- **Sub-Documentation Infrastructure (`/docs`):** Introduced dedicated in-depth documentation for system architecture, authentication flows, database models, S3/local storage, Instagram ingestion pipelines, REST APIs, and Docker deployments.
- **Code & Tech Stack Synchronization:** Synchronized documentation with codebase reality (React 19, React Router 7, `MEMWAULT_` environment variable prefix, Python 3.10+).
- **Containerized Infrastructure & Authentication:** Documented Docker Compose multi-container deployment (Postgres, Redis, MinIO, FastAPI, Celery) and local application authentication flow.

### Version 2.4 — Engagement, Privacy & UI
- **Archived Engagement Metrics:** Added permanent tracking for `viewer_count` and `like_count` in database schemas, scrapers, and metadata pipelines.
- **Account Safety Architecture:** Documented the decision to avoid scraping individual viewer lists to reduce account restriction risks.
- **EXIF/XMP Context Embedding:** Embedded captions, music, locations, and engagement directly into media metadata.
- **Unified Spring-Based Controls:** Standardized segmented controls and filter toggles across Timeline, Story Detail, Highlights, and Settings using Framer Motion.
- **Native Desktop Integration:** Windows Explorer and interactive Playwright browser sessions launch directly in native desktop windows when running on host OS.

### Version 2.3 — Sidecar Journal & Dynamic Highlights
- **Dynamic Highlight Grid:** Covers dynamically render as 4-Image Grids, 3-Image layouts, or vertical dual-views.
- **Contextual Sidecar Journaling:** Attach rich Markdown notes to any story, written as `.md` files directly next to your media files on disk.

### Version 2.2 — Archives & Search Update
- **Robust Archives (Trash):** Soft-delete and restore individual or bulk-selected stories.
- **Full-Text Backend Search:** Full-text SQL search engine across historical stories.

### Version 2.1 — Highlights & Albums
- **Highlights & Albums Integration:** Curate downloaded stories into custom Highlight Albums locally.
- **Media Sync & Pre-Signed URLs:** Dynamic S3 pre-signed URLs for decoupled storage environments.

### Version 2.0 — Timeline, Maps & Navigation
- **Smooth Page Transitions & FastScrollbar:** Drag through years of memories in milliseconds.
- **Interactive Spatial Map:** Initial release of spatial geographic marker clustering.

---

# 🛠️ Developer Documentation

## Architecture & System Flow

MemWault uses a React 19 PWA frontend backed by FastAPI, with PostgreSQL/SQLite persistence, configurable local/S3 media storage, and background processing through Celery/Redis.

```text
┌────────────────────────────────────────────────────────┐
│                   MemWault UI (PWA)                    │
│            React 19 + Vite + Framer Motion             │
└───────────────────────────┬────────────────────────────┘
                            │ REST API / HTTP
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│             Async REST API & Web Handlers              │
└──────┬────────────────────┬────────────────────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Database   │     │ Media Storage│     │ Redis Queue  │
│ SQLite / PG │     │ Local / S3   │     │ Task Broker  │
└──────▲──────┘     └──────────────┘     └──────┬───────┘
       │ Session                                │
       │ Cookies                                ▼
┌──────┴─────────────────────┐           ┌──────────────┐
│ Host Browser Session       │           │Celery Workers│
│ (Playwright / Chrome)      │           │Scraper Engine│
└──────────────┬─────────────┘           └──────┬───────┘
               │ Auth                           │ Ingestion
               ▼                                ▼
┌────────────────────────────────────────────────────────┐
│                 Instagram Mobile & Web                 │
└────────────────────────────────────────────────────────┘
```

📖 **Detailed Architecture Guide:** [`docs/architecture.md`](docs/architecture.md)

---

## Memory Object Model

The `Story` entity is the core archival object. Rather than treating media as a standalone file, MemWault models the Story as a media asset plus its temporal, spatial, compositional, social, engagement, and archival context.

Every attribute in a MemWault memory object is mapped to its exact origination source and authority model (Instagram CDN binary, raw API metadata, iTunes audio enrichment, or user-authored sidecar notes).

📖 **Detailed Memory Model & Provenance Guide:** [`docs/memory-model.md`](docs/memory-model.md)

---

## Authentication & Session Isolation

MemWault separates dashboard user access from Instagram session credentials:

```text
MemWault Application
├── 1. Local Browser Login (Playwright / Chrome)
│   └── Instagram session established locally
│   └── Session cookies persisted in DB
└──────► 2. Celery Scraper Engine (instagrapi)
         └── Fetches active stories & archived engagement
                 │
                 ▼
         3. FastAPI REST API (Bearer JWT Auth)
                 │
                 ▼
         4. React 19 Dashboard UI
```

- **Dashboard Auth:** FastAPI issues signed JSON Web Tokens (JWT) stored in `localStorage`. Passwords are salt-hashed using `bcrypt`.
- **Scraper Safety:** MemWault deliberately avoids automated individual viewer-list retrieval to reduce account risk. Legacy `StoryViewer` schemas and endpoints remain solely for compatibility with older historical archives.

📖 **Detailed Security Guide:** [`docs/authentication.md`](docs/authentication.md)  
📖 **Detailed Instagram Ingestion Guide:** [`docs/instagram.md`](docs/instagram.md)

---

## Storage & Media Model

MemWault keeps your archive under your control, supporting local and self-controlled storage configurations:

- **Local / Self-Hosted:** SQLite / PostgreSQL database + local drive filesystem (`media/<user_id>/<year>/<month>/<story_id>.jpg`) and `.md` sidecars.
- **Self-Controlled Object Storage:** MinIO container.
- **Remote Object Storage:** Private AWS S3 bucket.

📖 **Detailed Storage Guide:** [`docs/storage.md`](docs/storage.md)  
📖 **Detailed Metadata Guide:** [`docs/metadata.md`](docs/metadata.md)

---

## Repository Structure

```text
MemWault/
├── techstack/
│   ├── backend/           # FastAPI backend server & Celery background workers
│   │   ├── app/
│   │   │   ├── api/       # REST API endpoints (Auth, Stories, Storage)
│   │   │   ├── scraper/   # Instagram browser login & scraper engine
│   │   │   └── models.py  # SQLAlchemy database schemas
│   │   └── requirements.txt
│   └── frontend/          # React 19 + Vite PWA frontend
│       ├── src/
│       │   ├── components/# Framer Motion UI components (FastScrollbar, StoryCard)
│       │   ├── pages/     # Timeline, StoryDetail, MapView, Settings, Archives
│       │   └── services/  # API service client
│       └── package.json
├── docs/                  # In-depth technical & architectural documentation
│   ├── architecture.md
│   ├── authentication.md
│   ├── memory-model.md
│   ├── instagram.md
│   ├── api.md
│   ├── deployment.md
│   ├── storage.md
│   ├── metadata.md
│   └── configuration.md
├── screenshots/           # HD UI screenshots showcase
├── removed_features.md    # Internal design history & rationale
└── README.md
```

---

## Quickstart & Development

### 1. Environment Requirements

- **Core Prerequisites (Minimal API & UI Development):**
  - Python 3.10+
  - Node.js 18+
  - *Database Note:* SQLite is used by default for local development (`MEMWAULT_DATABASE_TYPE=sqlite`). PostgreSQL is optional.

- **Ingestion Prerequisites (Full Scraping & Session Ingestion):**
  - Redis (only when `MEMWAULT_CELERY_ALWAYS_EAGER=false`; by default tasks run inline and Redis is not needed)
  - Playwright Chromium (`playwright install chromium` required for local Instagram browser authentication)
  - **ExifTool** (optional, for embedding archival context into media files). MemWault looks for it on your `PATH`, or as `techstack/backend/exiftool_bin/exiftool`(`.exe`). Without it, EXIF/XMP embedding is skipped and a warning is logged — everything else works normally.

> **Desktop-only features:** "Show in Folder" and the Instagram browser login open a window on your machine, so they need the backend running on your host OS. In Docker they return HTTP 501 with an explanation rather than failing silently.

### 2. Backend Setup
```bash
cd techstack/backend
python -m venv venv

# Activate Virtual Environment (Windows)
.\venv\Scripts\activate

# Install Dependencies & Playwright Browsers
pip install -r requirements.txt
playwright install chromium

# Start FastAPI Server
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Background Worker Setup (Required for Scraper Pipeline)
```bash
cd techstack/backend
.\venv\Scripts\activate

# Start Celery Worker Execution
celery -A app.scraper.tasks worker --loglevel=info
```

> *Note: `MEMWAULT_CELERY_ALWAYS_EAGER` defaults to `true`, which runs scrape tasks inline inside the API process — so neither Redis nor this worker is required for local development. Set it to `false` to use a real Redis-backed queue.*

### 4. Frontend Setup
```bash
cd techstack/frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## Docker Setup

Launch the complete containerized stack (PostgreSQL, Redis, MinIO, FastAPI, Celery Workers, Celery Beat, and Nginx React 19 PWA):

```bash
cd techstack
docker compose up -d --build
```

📖 **Detailed Deployment Guide:** [`docs/deployment.md`](docs/deployment.md)

---

## Configuration

MemWault is configured using environment variables with the `MEMWAULT_` prefix.

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `MEMWAULT_DATABASE_TYPE` | `sqlite` | Database engine (`sqlite` or `postgres`) |
| `MEMWAULT_POSTGRES_HOST` | `localhost` | PostgreSQL host address |
| `MEMWAULT_REDIS_URL` | `redis://localhost:6379/0` | Redis broker URI for Celery tasks |
| `MEMWAULT_STORAGE_TYPE` | `local` | Storage mode (`local` or `s3`) |
| `MEMWAULT_STORAGE_LOCAL_DIR` | `./data/media` | Host filesystem path for media storage |
| `MEMWAULT_SECRET_KEY` | *[Change in Prod]* | Secret key for JWT signing |

> *Note: Only the variables required by your selected database engine and storage provider need to be configured (e.g., PostgreSQL credentials are ignored when `MEMWAULT_DATABASE_TYPE=sqlite`).*

📖 **Detailed Configuration Guide:** [`docs/configuration.md`](docs/configuration.md)  
📖 **REST API Reference:** [`docs/api.md`](docs/api.md)

---

## Known Limitations

- **Volatile Endpoints:** Instagram integration depends on private endpoints and rate limits; changes by Instagram may require session updates.
- **Desktop Integration:** Native file manager ("Show in Folder") and Playwright browser popups require the backend to run on the host OS; containerized environments (Docker) cannot directly launch host desktop applications.

---

## Design Decisions

Some features have been deliberately removed or avoided to preserve archival authenticity, reduce account risk, or prevent unnecessary software complexity.

📖 **See [`removed_features.md`](removed_features.md) for full design rationale regarding removed timeline date filters and custom music player overlays.**

---

## License

Licensed under the **PolyForm Noncommercial License 1.0.0**.

Copyright (c) 2026 **Mehul Jain (mehuljain866)**. All rights reserved.

> You may obtain a copy of the License at [https://polyformproject.org/licenses/noncommercial/1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).  
> Personal use, research, and noncommercial educational use are permitted under the PolyForm Noncommercial License.
