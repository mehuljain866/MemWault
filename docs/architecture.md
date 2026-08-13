# MemWault — Architecture Documentation

This document provides a deep technical dive into the architecture, execution model, data pipelines, and system components of **MemWault**.

---

## 🏗️ System Overview

MemWault is built as a self-hosted, modular client-server application with an asynchronous Python backend and a reactive single-page frontend.

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

---

## 📦 Core Components

### 1. Frontend (Client Layer)
- **Framework:** React 19 initialized via Vite.
- **Routing & State:** React Router 7 with memory-preserved outlets (`useOutlet()`) preventing component unmounting during exit transitions.
- **Animations:** Framer Motion layout animations (`<motion.span layoutId="..." />`) with spring physics (`stiffness: 380, damping: 34`).
- **Spatial Map:** Leaflet.js with spatial marker clustering (`L.markerClusterGroup`) and bounding-box spatial queries.
- **Scrubbing Engine:** `FastScrollbar` high-frequency custom scroll listener enabling timeline jumps across thousands of items in milliseconds.

### 2. Backend (API Layer)
- **Framework:** FastAPI running on Python 3.10+ with Uvicorn async worker processes.
- **ORM & Migrations:** SQLAlchemy 2.0 async engine (`aiosqlite` for local dev, `asyncpg` for PostgreSQL production) managed via Alembic migrations.
- **Authentication:** JWT application authentication (HS256) with `bcrypt` salt-hashed passwords.
- **Desktop Bridge:** Windows Win32 native `subprocess` integration (`cmd.exe /c start ""` & `os.startfile`) ensuring Explorer file locators and Playwright Chromium pop up in the interactive desktop session.

### 3. Background Processing & Ingestion (Worker Layer)
- **Task Broker & Store:** Redis + Celery worker queue.
- **Scraper Engine:** Dual-layer ingestion using Playwright stealth browser contexts for authentication and `instagrapi` for periodic story extraction.
- **Ingestion Pipeline:**
  1. Poll active stories for logged-in session.
  2. Parse EXIF tags, captions, music metadata, location coordinates, viewer counts, and like counts.
  3. Segregate Reels reposted to Stories vs personal Stories.
  4. Save media to local disk/S3 storage.
  5. Index record in database & sync `.md` sidecar journal file.

### 4. Storage & Media Management
- **Local Storage:** Media stored under `media/<user_id>/<year>/<month>/<story_id>.jpg` accompanied by human-readable `.md` sidecar notes.
- **Object Storage:** Pre-signed URL generation for S3-compatible backends (AWS S3 / MinIO).
