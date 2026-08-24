# MemWault

<p align="center">
  <img src="screenshots/dashboard_home.jpg" alt="MemWault Dashboard" width="100%" style="border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

<p align="center">
  <b>A self-hosted personal memory archive for preserving social media stories, posts, and personal journals in a private, searchable vault under your control.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v3.2.0-0A84FF?style=for-the-badge" alt="Version 3.2.0" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB?style=for-the-badge" alt="React 19" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10+-009688?style=for-the-badge" alt="FastAPI" />
  <img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial-FF9500?style=for-the-badge" alt="PolyForm License" />
</p>

<p align="center">
  <b>Self-Hosted • Local-First • Progressive Web App (PWA)</b>
</p>

---

## Table of Contents

- [Why MemWault?](#why-memwault)
- [Product Philosophy: Sanctuary vs Platform](#product-philosophy-sanctuary-vs-platform)
- [Key Features](#key-features)
- [Memory Object Model & Provenance](#memory-object-model--provenance)
- [Multi-Era Visual Environments](#multi-era-visual-environments)
- [Engineering Architecture](#engineering-architecture)
- [Repository Structure](#repository-structure)
- [Quickstart & Installation](#quickstart--installation)
- [Docker Setup](#docker-setup)
- [Configuration](#configuration)
- [Design Decisions & Changelog](#design-decisions--changelog)
- [License](#license)

---

## Why MemWault?

> **Social media is ephemeral. Your memories shouldn't be.**

Social media platforms treat memories as temporary assets optimized for real-time engagement loops. When posts expire or accounts change, the surrounding context—captions, music, location tags, camera filters, engagement metrics, and personal reflections—is often permanently lost.

**MemWault** creates an independent, self-hosted archive that keeps your media and metadata together in standard, open formats on your own machine or private storage.

- **Preservation Over Reinterpretation:** Media is stored in its authentic raw format, with metadata layered around it rather than altering the archived Story.
- **Data Ownership & Portability:** Store your history locally in open SQLite or PostgreSQL databases with standard media files and Markdown `.md` sidecars free from cloud lock-in.
- **Context Preservation:** Capture the full narrative around each memory—music references, coordinates, user mentions, viewer counts, and personal journal notes.
- **Distraction-Free:** No algorithmic feeds, notifications, or sponsored content. A quiet space for personal reflection.

---

## Product Philosophy: Sanctuary vs Platform

> **Social media is designed to extract your attention. MemWault is designed to preserve your memories.**

Mainstream platforms are engineered around ads, algorithmic feeds, and engagement loops whose goal is to extract your time and monetize your social graph. MemWault is built upon a different philosophy: **A user-owned, distraction-free sanctuary for personal reflection.**

```text
┌─────────────────────────────────────────────────────────────┐
│  SOCIAL PLATFORMS                                           │
│  • Goal: Extract attention & maximize ad impressions        │
│  • Medium: Algorithmic feeds, infinite scrolls, nudges      │
│  • UI: Rigid, platform-enforced, optimized for consumption  │
└─────────────────────────────────────────────────────────────┘
                              vs
┌─────────────────────────────────────────────────────────────┐
│  MEMWAULT (Your Personal Memory Archive)                    │
│  • Goal: Pure reflection, preservation & meaning-making     │
│  • Medium: Local-first, zero ads, zero behavioral traps     │
│  • UI: Sovereign interaction — you choose how to experience │
└─────────────────────────────────────────────────────────────┘
```

### Core Tenets

1. **Sovereign Interaction Flow:**
   Open MemWault → Explore memories → Reflect and journal → Leave with peace of mind. No infinite feeds, no unskippable sponsored content, and no algorithmic nudges.

2. **Visual Era as an Interaction Layer:**
   Customization is not just changing an accent color; it governs your relationship with your past. MemWault treats visual design as an interchangeable lens—allowing the same memory archive to be experienced through different historical and modern design paradigms.

3. **Total Data Sovereignty:**
   Your memories belong to you. Stored locally with open schemas, standard image/video files, and human-readable Markdown `.md` sidecars that outlive any specific application.

---

## Key Features

- **Smart Media Segregation:** Distinguishes between ephemeral Stories, multi-slide Carousels, and Feed Posts as distinct archival entities.
- **Pocket Companion PWA (`/pocket`):** Mobile companion interface featuring panoramic pivot navigation, live tiles, 20 theme accents, and full offline caching via IndexedDB and CacheStorage.
- **Ephemeral QR Device Pairing:** Pair mobile devices via single-use QR tickets that burn upon first scan. Issues scoped companion tokens without exposing main dashboard credentials.
- **Live Handshake Detection:** Desktop pairing wizard automatically detects when a phone scans the QR code, transitions to a success screen with audio feedback, and tracks linked devices.
- **Optional Remote Access:** Built-in encrypted Cloudflare quick tunnels allow mobile companion syncing across 4G/5G mobile data from anywhere without router port forwarding.
- **Direct Mobile Upload Portal:** Stream uncompressed photos, 4K videos, and custom wallpapers directly from your phone to your PC vault over local Wi-Fi.
- **RAW Master Versioning:** Swap compressed Instagram CDN copies with uncompressed camera master files while preserving all metadata and sidecars.
- **Sidecar Markdown Journaling:** Write rich Markdown notes attached to any memory, saved as human-readable `.md` files directly next to your media files on disk.
- **Continuous Zoom Timeline:** Smoothly transition between Years, Months, and Days views using spring-physics animations.
- **Spatial Story Map:** Explore memories geographically on an interactive Leaflet map featuring spatial clustering and location search.
- **Highlight Albums:** Curate stories into custom albums with dynamic 4-image grid covers and video preview playlists.
- **Metadata & AR Filter Extraction:** Preserves capture timestamps, location venues, music references, user tags, viewer/like counts, and AR camera filter effects.
- **EXIF & Metadata Embedding:** Option to embed archival context directly into media files using ExifTool.

---

## Memory Object Model & Provenance

MemWault models each memory as a structured archival object rather than a bare file. Every attribute has an explicit origination source and authority model (Instagram CDN binary, raw API metadata, iTunes enrichment, or user-authored sidecar notes):

```text
Single Archived Memory Object
├── 📷 Original Media Asset      (Raw .jpg photo or .mp4 video)
├── ⏱️ Story Timestamp           (UTC creation timestamp)
├── 💬 Caption & Text Content     (Raw caption and text sticker layers)
├── 🎨 Composition Manifest       (Sticker positions and composition layout)
├── 🎭 AR Camera Filter & Effect  (Original filter name and camera effect ID)
├── 🎵 Music Track Information    (Song title, artist, 30s preview reference)
├── 📍 Geolocation Data           (Venue name & GPS coordinates)
├── 🏷️ User Mentions              (Tagged usernames)
├── 📈 Engagement Metrics         (Viewer count and story like count snapshot)
├── 📓 Sidecar Journal Note       (Human-authored Markdown .md file)
└── 🖼️ Highlight Metadata         (Album memberships & cover attributes)
```

📖 **Detailed Memory Model & Provenance Guide:** [`docs/memory-model.md`](docs/memory-model.md)

---

## Multi-Era Visual Environments

MemWault treats visual design as an interaction layer, allowing the same underlying memory archive to be experienced through different historical and modern design paradigms:

- 📱 **iOS Modern:** Clean, responsive interface designed for fast touch and keyboard navigation.
- 🪟 **Windows 98 Desktop:** Desktop environment complete with Start Menu, Taskbar, Draggable Windows, CRT Monitor Preview, desktop gadgets, authentic system sound effects, and an interactive assistant (**Clippy**) for contextual guidance and search Q&A.
- 💿 **Y2K Brushed Chrome:** Turn-of-the-millennium aesthetic with brushed metal textures and futuristic accents.
- 💧 **Aqua Theme:** Early macOS-inspired theme with glossy elements and pinstriped backgrounds.
- 📱 **Lumia Pivot Interface:** Mobile companion interface inspired by Windows Phone panoramic pivot navigation and live tiles.

📖 **Theme Showcases & Visual Tours:** [`docs/themes/`](docs/themes/)

---

## Engineering Architecture

MemWault pairs a React 19 PWA frontend with an asynchronous FastAPI backend, supporting local filesystem storage or S3-compatible object storage.

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

### Engineering Highlights

- **Asynchronous Backend:** FastAPI with SQLAlchemy 2.0 async connection pooling (`aiosqlite` / `asyncpg`).
- **Separated Authentication Domains:** App dashboard uses salted bcrypt hashing + signed JWTs; Instagram sessions are managed separately via local browser sessions.
- **Distributed Ingestion Pipeline:** Redis + Celery worker queue for background polling (tasks execute inline in development when Redis is omitted).
- **Scraper Safety:** Deliberately avoids volatile endpoints (such as automated individual viewer-list scraping) to reduce account risk. Legacy schemas remain strictly for historical archive compatibility.
- **Storage Abstraction:** Media is stored on the local filesystem (`media/<user_id>/<year>/<month>/<id>.jpg`) alongside `.md` sidecars, with optional support for S3/MinIO.
- **Single-Port Production Serving:** FastAPI directly serves pre-compiled PWA bundles with SPA fallback routing and Service Worker precaching.

📖 **Detailed Technical Guides:**
- [System Architecture](docs/architecture.md)
- [Authentication & Security](docs/authentication.md)
- [Storage Configurations](docs/storage.md)
- [Instagram Ingestion](docs/instagram.md)
- [REST API Reference](docs/api.md)

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

📖 **See [`removed_features.md`](removed_features.md) for design rationale regarding removed features.**

---

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md) for release notes and version history.

---

## License

Licensed under the **PolyForm Noncommercial License 1.0.0**.

Copyright (c) 2026 **Mehul Jain (mehuljain866)**. All rights reserved.

> You may obtain a copy of the License at [https://polyformproject.org/licenses/noncommercial/1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).  
> Personal use, research, and noncommercial educational use are permitted under the PolyForm Noncommercial License.
