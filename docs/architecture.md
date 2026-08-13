# MemWault — Architecture Documentation

This document provides a deep technical dive into the architecture, execution model, data pipelines, and system components of **MemWault**.

---

## 🏗️ System Overview

MemWault is built as a self-hosted, modular client-server application with an asynchronous Python backend and a reactive single-page frontend.

```text
┌────────────────────────────────────────────────────────┐
│                   MemWault UI (PWA)                    │
│            React 18 + Vite + Framer Motion             │
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
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │Celery Workers│
                                         │Scraper Engine│
                                         └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │  Instagram   │
                                         │ Mobile / Web │
                                         └──────────────┘
```

---

## 📦 Core Components

### 1. Frontend (Client Layer)
- **Framework:** React 18 with Vite.
- **Routing:** React Router v6.
- **Animations:** Framer Motion (`AnimatePresence`, `layoutId` spring transitions).
- **Map Engine:** Leaflet.js with spatial marker clustering.
- **State Management:** React Hooks + Local Storage token persistence.

### 2. Backend (API Layer)
- **Framework:** FastAPI running on Python 3.12 + Uvicorn.
- **ORM:** SQLAlchemy 2.0 with async engine (`asyncpg` for PostgreSQL / `aiosqlite` for SQLite).
- **Authentication:** OAuth2 password flow with JWT access tokens and `bcrypt` password hashing.
- **Desktop Bridge:** Native Win32 `subprocess` integration (`cmd.exe /c start ""` & `os.startfile`) for launching foreground Explorer windows and local browser sessions.

### 3. Background Processing (Worker Layer)
- **Broker & Backend:** Redis + Celery.
- **Scraper Engine:** `instagrapi` mobile client emulation combined with Playwright stealth browser contexts for authentication.
- **Ingestion Pipeline:** Automatic periodic polling of stories, media downloading, metadata parsing, and database indexing.

### 4. Storage & Media Management
- **Local Storage:** Media stored on disk under `media/<user_id>/` with sidecar `.md` journal files.
- **Object Storage:** Optional S3-compatible backend (AWS S3 / MinIO) for cloud deployment.
