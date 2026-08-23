# MemWault

<p align="center">
  <img src="screenshots/dashboard_home.jpg" alt="MemWault Dashboard" width="100%" style="border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

<p align="center">
  <b>A self-hosted personal memory archive for preserving social media stories, posts, and personal journals in a private, searchable vault under your control.</b>
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

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture & Data Model](#architecture)
- [Repository Structure](#repository-structure)
- [Quickstart & Installation](#quickstart--installation)
- [Docker Setup](#docker-setup)
- [Configuration](#configuration)
- [Changelog](#changelog)
- [License](#license)

---

## Overview

Social media platforms treat memories as temporary content designed for engagement loops. When posts expire or platforms change, the surrounding context—captions, music, location tags, timestamps, and personal reflections—is often lost.

**MemWault** creates an independent, self-hosted archive that keeps your media and metadata together in standard, open formats on your own machine or private storage.

- **Data Ownership:** Store your history locally in open SQLite or PostgreSQL databases with standard media files and Markdown `.md` sidecars.
- **Context Preservation:** Capture the full context around each memory—music references, coordinates, tagged users, viewer counts, and personal journal notes.
- **Distraction-Free:** No algorithmic feeds, notifications, or sponsored content. A quiet space for personal reflection.
- **Offline Access:** Mobile companion PWA with IndexedDB caching to keep your archive accessible without an internet connection.

---

## Key Features

- **Media Ingestion & Segregation:** Organizes ephemeral Stories, multi-slide Carousels, and Feed Posts into distinct archival categories.
- **Pocket Companion PWA (`/pocket`):** Mobile companion interface with panoramic pivot navigation, live tiles, 20 theme accents, and full offline caching via IndexedDB and CacheStorage.
- **Device Pairing & Remote Sync:** Pair mobile devices via single-use QR codes that burn upon scan. Connect over local Wi-Fi or encrypted Cloudflare tunnels to sync over cellular data without port forwarding.
- **Direct Mobile Upload Portal:** Stream uncompressed photos, videos, and custom wallpapers directly from your phone to your vault over local Wi-Fi.
- **Sidecar Markdown Journaling:** Write Markdown notes attached to any memory, saved as human-readable `.md` files alongside media files on disk.
- **Continuous Zoom Timeline:** Smoothly transition between Years, Months, and Days views using spring-physics animations.
- **Spatial Map View:** Browse memories geographically on an interactive Leaflet map with spatial clustering and location search.
- **Highlight Albums:** Curate stories into custom albums with dynamic 4-image grid covers and video preview playlists.
- **Master Media Replacement:** Swap compressed web copies with original camera master files while preserving all metadata.
- **Multi-Era Visual Themes:** Browse your archive in the interface of your choice—Modern, Classic Windows 98, Y2K Brushed Chrome, or Aqua.
- **Audio & Music References:** Embedded mini-player with external preview streaming for tracks tagged in your stories.
- **EXIF & Metadata Embedding:** Option to embed archival context directly into media files using ExifTool.

---

## Architecture

MemWault pairs a React 19 PWA frontend with a FastAPI backend, supporting local filesystem storage or S3-compatible object storage.

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
