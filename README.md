# MemWault

<p align="center">
  <img src="screenshots/dashboard_home.jpg" alt="MemWault Dashboard" width="100%" style="border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

<p align="center">
  <b>A private, self-hosted memory archive for preserving social media stories, posts, and personal journals alongside their authentic surrounding context—music, locations, composition layers, engagement metrics, and reflections—in a searchable vault under your total control.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v3.2.0-0A84FF?style=for-the-badge" alt="Version 3.2.0" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial-FF9500?style=for-the-badge" alt="PolyForm License" />
</p>

<p align="center">
  <b>Self-Hosted • Local-First • Progressive Web App (PWA)</b>
</p>

---

## Table of Contents

- [Why MemWault?](#why-memwault)
- [Product Philosophy: Sanctuary vs Platform](#product-philosophy-sanctuary-vs-platform)
  - [Core Tenets](#core-tenets)
- [Key Features](#key-features)
- [What MemWault Preserves (Memory Object Model)](#what-memwault-preserves-memory-object-model)
- [Engineering Architecture](#engineering-architecture)
  - [Authentication & Session Isolation](#authentication--session-isolation)
  - [Storage & Media Model](#storage--media-model)
- [Multi-Era Visual Environments](#multi-era-visual-environments)
- [Repository Structure](#repository-structure)
- [Quickstart & Development](#quickstart--development)
  - [Environment Requirements](#1-environment-requirements)
  - [Backend Setup](#2-backend-setup)
  - [Background Worker Setup](#3-background-worker-setup)
  - [Frontend Setup](#4-frontend-setup)
  - [Docker Setup](#docker-setup)
- [Configuration](#configuration)
- [Account Safety, Rate Limiting & Anti-Ban Architecture](#account-safety-rate-limiting--anti-ban-architecture)
- [Currently Known Limitations & Development Oddities](#currently-known-limitations--development-oddities)
- [Design Decisions](#design-decisions)
- [License](#license)

---

## Why MemWault?

> **Social media is ephemeral. Your memories shouldn't be.**

Social media platforms treat memories as temporary content optimized for real-time engagement loops. When posts expire or platforms change, the surrounding context—captions, music references, location coordinates, camera filters, engagement metrics, and personal reflections—is often permanently lost.

**MemWault** creates an independent, self-hosted archive that keeps your media and metadata together in standard, open formats on your own machine or private storage.

- **Preservation Over Reinterpretation:** Media is stored in its authentic raw format, with metadata layered around it rather than altering the archived Story itself.
- **Account Safety & Privacy:** Scraper workflows operate locally with rate limiting and deliberately avoid volatile endpoints to minimize account restriction risk.
- **Data Ownership & Portability:** Store your history locally in open SQLite or PostgreSQL databases with standard media files and Markdown `.md` sidecars free from cloud lock-in.
- **Context Preservation:** Capture the full narrative around each memory—music tags, coordinates, user mentions, viewer counts, AR camera filters, and personal journal notes.
- **Distraction-Free Sanctuary:** No algorithmic feeds, notifications, or sponsored content. A quiet, sovereign space for personal reflection.

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

- **Smart Media Segregation:** Distinguishes between 24-hour Stories, reels, multi-slide Carousels, and Feed Posts as distinct archival entities.
- **Pocket Companion PWA (`/pocket`):** Mobile companion interface featuring panoramic pivot navigation, live tiles, 20 Metro theme accents, 100% offline IndexedDB cache, and bidirectional sync.
- **QR Device Pairing:** Pair mobile devices via single-use QR tickets that burn upon first scan. Issues scoped companion tokens without exposing main dashboard credentials.
- **Live Handshake Detection:** Desktop pairing wizard automatically detects when a phone scans the QR code, transitions to a success screen with audio feedback, and tracks linked companion devices.
- **Encrypted Cloudflare Remote Tunneling:** Built-in zero-config HTTPS tunneling (`trycloudflare.com`) allows mobile companion syncing across 4G/5G mobile data from anywhere without router port forwarding.
- **Direct Mobile Upload Portal:** Stream uncompressed photos, 4K videos, and custom wallpapers directly from your phone to your PC vault over local Wi-Fi.
- **RAW Master Versioning:** Swap compressed Instagram CDN copies with uncompressed camera master files while preserving all metadata and sidecars.
- **Archived Engagement Metrics:** Preserve Story viewer counts and like count snapshots captured at archival time alongside media and metadata.
- **Sidecar Markdown Journaling:** Write rich Markdown notes attached to any memory, saved as human-readable `.md` files directly next to your media files on disk with a visual "+ New Entry" memory picker.
- **Continuous Zoom Timeline:** Smoothly transition between Years, Months, and Days views using spring-physics animations.
- **Spatial Story Map:** Explore memories geographically on an interactive Leaflet map featuring spatial clustering and location search.
- **Highlight Albums:** Curate stories into custom Highlight albums with dynamic 4-thumbnail collage covers, video preview playlists, and local cover uploads.
- **Music Hub & Turntable Player:** Dedicated audio vault with turntable playback, 1-tap jump to exact memory stories/posts, and a multi-memory picker sheet for songs shared across multiple moments.
- **Scalable 9:16 Vertical Story Viewport:** Authentic uncropped 9:16 vertical viewport with animated collapsible inspector bottom sheet and edge-to-edge fullscreen tap navigation.
- **Intelligent On This Day & Flashbacks:** Multi-tier anniversary algorithm surfacing exact-date matches, same-week throwbacks, same-month memories, and vault flashbacks from past years.
- **Metadata & AR Filter Extraction:** Preserves capture timestamps, location venues, music references, user tags, viewer/like counts, and AR camera filter effects.
- **Portable Metadata & EXIF:** Option to embed archival context directly into media files using ExifTool.

---

## What MemWault Preserves (Memory Object Model)

MemWault models each memory as a structured archival object rather than a bare file. Every attribute has an explicit origination source and authority model (Instagram CDN binary, raw API metadata, iTunes audio enrichment, or user-authored sidecar notes):

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

### Authentication & Session Isolation

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
- **Scraper Safety:** MemWault deliberately avoids automated individual viewer-list scraping to reduce account risk. Legacy `StoryViewer` schemas remain strictly for compatibility with older historical archives.

### Storage & Media Model

MemWault keeps your archive under your control, supporting local and self-controlled storage configurations:

- **Local / Self-Hosted:** SQLite / PostgreSQL database + local drive filesystem (`media/<user_id>/<year>/<month>/<story_id>.jpg`) alongside `.md` sidecars.
- **Self-Controlled Object Storage:** MinIO container.
- **Remote Object Storage:** Private AWS S3 bucket.

📖 **Detailed Technical Guides:**
- [System Architecture](docs/architecture.md)
- [Authentication & Security](docs/authentication.md)
- [Storage Configurations](docs/storage.md)
- [Instagram Ingestion](docs/instagram.md)
- [REST API Reference](docs/api.md)

---

## Multi-Era Visual Environments

MemWault is designed around the idea that an archive should be explored spatially and temporally—not simply browsed as a folder of files. To complement this, we have built a **Multi-Era Design Architecture** allowing you to explore your memories in the aesthetic of your choice.

Rather than cluttering this document with dozens of screenshots, we have dedicated showcase pages for each handcrafted UI theme:

- 📱 [**iOS HIG (Modern) Theme**](docs/themes/iOS_HIG.md) — The default, highly polished modern interface built around clean typography, touch responsiveness, and fast keyboard navigation.
- 🪟 [**Windows 98 Desktop Theme**](docs/themes/Win98.md) — A bit-for-bit recreation of the classic 1998 Microsoft Windows desktop environment, complete with Start Menu, Taskbar, Draggable Windows, CRT Monitor Preview, desktop gadgets, 2x2 halftone dither controls, authentic property sheets, retro WAV audio suite, and an optional interactive assistant for search guidance.
- 💿 [**Y2K Brushed Chrome Theme**](docs/themes/Y2K.md) — Inspired by the turn of the millennium, featuring brushed metal textures and the optimistic tech-bubble aesthetic.
- 💧 [**Aqua Theme**](docs/themes/Aqua.md) — Inspired by early macOS X, featuring glossy elements and pinstriped backgrounds.
- 📱 [**Lumia Pivot Companion**](docs/themes/Lumia.md) — Mobile companion interface inspired by Windows Phone panoramic pivot navigation and live tiles.

---

## Repository Structure

```text
MemWault/
├── techstack/
│   ├── backend/           # FastAPI backend server & Celery background workers
│   │   ├── app/
│   │   │   ├── api/       # REST API endpoints (Auth, Stories, Storage, Pairing, Tunnel)
│   │   │   ├── scraper/   # Instagram browser login & scraper engine
│   │   │   └── models.py  # SQLAlchemy database schemas
│   │   └── requirements.txt
│   └── frontend/          # React 19 + Vite PWA frontend
│       ├── src/
│       │   ├── components/# UI components (FastScrollbar, StoryCard, MusicPlayer)
│       │   ├── pages/     # Timeline, StoryDetail, MapView, Settings, Archives, PocketCompanion
│       │   └── services/  # API service & offline IndexedDB storage engine
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

### 3. Background Worker Setup (Optional / Scraper Pipeline)

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

| Variable                     | Default Value              | Description                              |
|:---------------------------- |:-------------------------- |:---------------------------------------- |
| `MEMWAULT_DATABASE_TYPE`     | `sqlite`                   | Database engine (`sqlite` or `postgres`) |
| `MEMWAULT_POSTGRES_HOST`     | `localhost`                | PostgreSQL host address                  |
| `MEMWAULT_REDIS_URL`         | `redis://localhost:6379/0` | Redis broker URI for Celery tasks        |
| `MEMWAULT_STORAGE_TYPE`      | `local`                    | Storage mode (`local` or `s3`)           |
| `MEMWAULT_STORAGE_LOCAL_DIR` | `./data/media`             | Host filesystem path for media storage   |
| `MEMWAULT_SECRET_KEY`        | *[Change in Prod]*         | Secret key for JWT signing               |

> *Note: Only the variables required by your selected database engine and storage provider need to be configured (e.g., PostgreSQL credentials are ignored when `MEMWAULT_DATABASE_TYPE=sqlite`).*

📖 **Detailed Configuration Guide:** [`docs/configuration.md`](docs/configuration.md)  
📖 **REST API Reference:** [`docs/api.md`](docs/api.md)

---

## Account Safety, Rate Limiting & Anti-Ban Architecture

> [!WARNING]
> **Account Safety Notice:** MemWault interacts with Instagram using private web endpoints for personal archival purposes. Rapid burst requests, concurrent scraping tasks, or conflicting client signatures can trip Meta's automated account integrity detectors ("Suspicious activity detected / Account compromised"). MemWault is engineered with strict rate limits and defensive safeguards to protect your personal account.

### How Meta Integrity Detection Works
Meta's automated fraud and integrity systems continuously monitor account traffic for anomalies:
1. **Burst Frequency**: Dispatched requests occurring within milliseconds of one another indicate automated scripting rather than human browsing.
2. **Session / Header Discrepancies**: If an account logs in via a modern desktop Chromium browser on Windows, but API calls simulate an Android mobile app with different User-Agents or device identifiers using the same session cookies, the discrepancy is flagged as session hijacking.
3. **Concurrent Parallel Ingestion**: Triggering multiple scraping or metadata re-indexing processes simultaneously multiplies request frequency and triggers IP/account blocks.

### Built-in Safeguards in MemWault
To mitigate risk and ensure long-term account health, MemWault implements a multi-layer defense:

- **Desktop Web Client Parity (`X-IG-App-ID: 936619743392459`)**:
  All private endpoints (viewer lists, close friends lists, feed posts, story media) route through an authenticated desktop browser session header pipeline. MemWault decouples from mobile Android app emulation to match the exact browser fingerprint of your login session.
- **In-Flight Job Mutex (Server-Side)**:
  The backend strictly blocks duplicate or concurrent scrape jobs (`HTTP 429 Too Many Requests`). If an active scraping job is running for your account, all additional sync or scan triggers are denied until the active task finishes or times out.
- **Enforced Manual Sync Cooldown (60 Seconds)**:
  A strict 60-second cooldown is enforced between manual sync requests on `/scrape/now` to prevent rapid burst calls.
- **Client-Side Debounce & Continuous Polling**:
  All frontend sync buttons (`Timeline`, `Dashboard`, `Settings`, and Shells) disable immediately upon being clicked, show persistent continuous spinning feedback (`spin-anim`), and poll `GET /api/v1/scrape/status` every 1.5s until the background Celery task completes. Double-clicking or spam-clicking is prevented at both UI and API layers.
- **Passive Local Archival**:
  Once your stories and posts are ingested into the local SQLite database and media folders, browsing, filtering, playback, music playback, map exploration, and journal authoring occur **100% offline** without generating any traffic to Meta servers.

### Recommended Best Practices for Users & Forks
1. **Never Rapidly Trigger Syncs**: Allow each background sync job to conclude before triggering another. MemWault's scheduler can run periodically (e.g., once or twice daily) rather than constantly polling.
2. **If You Receive a Warning on Your Phone**:
   - Immediately change your Instagram password on your mobile device (this invalidates foreign sessions).
   - Observe a **24–48 hour automation cool-down** before logging MemWault back in.
   - Do not click "Full Scan" repeatedly; run it once to re-index and allow it to finish.
3. **Session Renewal**:
   - Use the built-in Playwright session renewal in **Settings > Account** to obtain a fresh browser session when cookies expire.

---

## Currently Known Limitations & Development Oddities

- **Temporary Quick Tunnels & PWA Bookmarks:** Account-less Cloudflare quick tunnels (`trycloudflare.com`) expire when the laptop or tunnel process restarts. If a mobile PWA bookmark was saved on an expired tunnel domain, Chrome will return `ERR_NAME_NOT_RESOLVED` until reconnected. For permanent, ultra-fast home network syncing, connect directly via your PC's Local Wi-Fi IP address (`http://<LAN_IP>:8000/pocket`).
- **Desktop Host OS Boundaries:** Native operating system calls (e.g., "Show in Folder" Explorer launch, Playwright interactive Instagram login windows) require backend execution on the host machine; in headless Docker environments, these endpoints return structured fallback notices.
- **Instagram Private API Rate Limits:** Ingestion workflows depend on Instagram private web endpoints; sessions should be refreshed periodically to avoid checkpoint challenges.
- **Development Port Topology:** During active development, Vite runs on port `5173` while FastAPI runs on port `8000`. In unified production builds, FastAPI serves the compiled SPA and service worker directly on a single port (`8000`).

---

## Design Decisions

Some features have been deliberately removed or avoided to preserve archival authenticity, reduce account risk, or prevent unnecessary software complexity.

📖 **See [`removed_features.md`](removed_features.md) for design rationale regarding removed features.**

---

## License

Licensed under the **PolyForm Noncommercial License 1.0.0**.

Copyright (c) 2026 **Mehul Jain (mehuljain866)**. All rights reserved.

> You may obtain a copy of the License at [https://polyformproject.org/licenses/noncommercial/1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).  
> Personal use, research, and noncommercial educational use are permitted under the PolyForm Noncommercial License.
