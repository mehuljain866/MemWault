# MemWault — Digital Memory Preservation & Archiving

> **Project Status:** v2.3

## What is MemWault?

MemWault is a private, local-first archive designed to permanently preserve, organize, and replay your Instagram stories outside of Meta's walled garden, while simultaneously serving as a self-hosted social media dashboard combining memories from multiple platforms into one unified timeline.

Over the last decade, Instagram Stories have become the default medium for documenting our daily lives, yet they remain vulnerable. MemWault was built to solve these specific problems:
* **Independence from Walled Gardens:** Meta locks your data in their ecosystem. If you lose your account (hacked or banned), you lose a decade of personal history. MemWault ensures you physically own it.
* **Preservation of Rich Context:** Instagram's native archive doesn't let you easily search by tagged friends, locations, or music. MemWault parses and indexes this rich metadata locally for powerful searching and geographic mapping.
* **Data Portability & Extensibility:** By having all stories and metadata in a local SQLite/Postgres database, it opens the door to personal analytics, journaling, and custom integrations.
* **Privacy & Security:** A self-hosted, private archive means you don't have to rely on third-party backup services sniffing your personal data.

---

## Core Platform Features

* **Local-First Archiving:** Full ownership of your data using a local SQLite/PostgreSQL database and local media storage (or S3/MinIO), entirely bypassing Meta's API restrictions.
* **Interactive Map View:** Geographic plotting, clustering, and bounding-box filtering of your memories on an immersive interactive map.
* **Custom Highlight Albums:** Curate and group your downloaded local stories into custom albums independently of Instagram.
* **Robust Full-Text Database Search:** A lightning-fast, backend SQL search engine. Instantly query your entire archive by location, caption, music title, or artist name.
* **Smart Media Segregation:** Automatically segregates "Reels reposted to Stories" from your organic memories, placing them in their own dedicated tab so they don't clutter your personal timeline.
* **Perpetual Viewer Tracking:** Automatically captures and permanently stores your story viewers just before the story expires, dynamically rendering them with clickable links to their Instagram profiles.
* **Meaning-Making Journal Editor (v2.3):** A core feature that allows you to write markdown-formatted journal entries attached directly to specific memories. Includes a highly customizable, side-by-side UI that seamlessly syncs `.md` files directly to your storage drive.
* **Music Integrations & iTunes API:** Features a built-in Music mini-player that instantly streams high-quality 30-second previews from the iTunes API for the songs attached to your stories.
* **PWA Offline Capabilities:** Progressive Web App architecture ensuring fast loading and offline capabilities.

---

## Version Updates

### Version 2.3 (The Meaning-Making Update)
* **Contextual Journaling:** Core feature addition allowing you to attach rich Markdown notes to any story. The editor runs side-by-side with your media for effortless journaling.
* **Native Sidecar Files:** Journal notes aren't just locked in the database; they are automatically written as `.md` files directly next to your media files on your local drive (or S3) for ultimate data portability.
* **Hyper-Customizable UI:** The editor interface can be toggled between "Modern (Docs)" and "Apple Notes (Invisible)" design philosophies, with fully customizable ribbon tools via the Settings dashboard.

### Version 2.2 (The Archive & Search Update)
* **Robust Archives (Trash):** Soft-delete/archive individual or bulk-selected stories from the main timeline. Archived stories are hidden from Memories and Reels but can be viewed and fully restored back to the timeline from the Archives page.
* **Timeline Bulk Actions:** Enter multi-select mode directly from the Timeline, select multiple memories, and archive them in one click via a sleek, glassmorphic bottom control bar.
* **Full-Text Database Search Engine:** Complete migration from client-side fuzzy searching to a powerful backend SQL engine, allowing for instantaneous queries across thousands of historical stories.

### Version 2.1 (The Highlights Update)
* **Highlights & Albums Integration:** Curate and group your downloaded stories into custom Highlight Albums locally.
* **Robust Media Sync & S3 URLs:** Improved backend APIs that dynamically generate pre-signed S3 URLs for Highlights, ensuring your covers and story media load perfectly even in decoupled storage environments.

### Version 2.0 (The UI & Maps Update)
* **Smooth Page & Layout Transitions:** Enjoy buttery-smooth page transitions (slide and fade) between tabs, and watch your media grid naturally glide and scale when zooming between Day, Month, and Year views.
* **Rapid Chronological Navigation:** Built-in `FastScrollbar` allows you to seamlessly drag and jump through months or years of memories in milliseconds, replacing tedious manual scrolling.
* **Map View:** The initial release of the interactive map clustering feature.

---

## Tech Stack & Architecture

MemWault is designed as a self-hosted full-stack application relying on a modern Python and JavaScript ecosystem.

* **Frontend:** React, Vite, Framer Motion, and Leaflet JS built as a PWA (Progressive Web App).
* **Backend:** FastAPI (Python) web server providing a highly concurrent async REST API.
* **Database:** PostgreSQL (production) or SQLite (local development) managed via SQLAlchemy 2.0 and Alembic.
* **Background Workers:** Celery + Redis for scheduled story polling and scraping tasks via `instagrapi`.
* **Storage:** Local directory structure or an S3-compatible object storage (MinIO/AWS) via `boto3`.

### Repository Layout
```text
MemWault/
├── techstack/
│   ├── backend/           # FastAPI backend & Celery workers
│   │   ├── app/
│   │   │   ├── api/       # API endpoints (Auth, Stories, Session)
│   │   │   ├── scraper/   # Instagram scraper & metadata parser
│   │   │   └── storage/   # S3 / Local media storage client
│   │   └── requirements.txt # Python dependencies
│   ├── frontend/          # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/# React UI Components (FastScrollbar, StoryPlayer)
│   │   │   ├── pages/     # Timeline, MapView, Settings, Archives, StoryDetail
│   │   │   └── services/  # API service client
│   │   └── package.json   # Node.js dependencies
│   └── docker-compose.yml # Dev environment (Postgres, Redis, MinIO)
└── README.md              # This file
```

---

## Authentication Architecture

Because this is a highly data-sensitive project, absolute transparency into the authentication flow is required. MemWault utilizes a robust dual-layer authentication architecture:

### 1. Instagram Session Management (Scraper Auth)
MemWault uses `instagrapi` to emulate an official Instagram mobile client. 
* **Secure Login:** You provide your Instagram credentials (or a session ID) which are sent securely to Instagram's servers. 
* **Cookie Handling & Anti-Ban:** The backend stores the resulting Instagram session cookies securely in the database (`InstagramSession` model). It actively rotates requests, mimics human delay, and adheres strictly to rate limits to avoid shadowbans or account restrictions.
* **No Third Parties:** Your credentials and cookies are never sent to a third-party server. They live entirely on your local machine.

### 2. App-Level Authentication (FastAPI & React)
To secure the MemWault dashboard itself (ensuring nobody else on your network can view your memories):
* **JWT Tokens:** FastAPI issues secure JSON Web Tokens (JWT) upon login. The React frontend stores this token and passes it in the `Authorization` header for all REST API requests.
* **Bcrypt Hashing:** App-level user passwords are computationally hashed using `bcrypt` with a unique salt before being stored in the database.
* **Database User Isolation:** A strict multi-tenant architecture is enforced at the ORM layer. Every database query explicitly filters by `user_id`, ensuring absolute data isolation if you host this for multiple family members.

### End-to-End Auth Flow:
1. User logs into the MemWault dashboard (App Auth) -> Receives JWT.
2. User provides Instagram credentials in the Settings panel.
3. Backend logs into Instagram (IG Auth) -> Retrieves and encrypts session cookies in the DB.
4. Background Celery tasks use the stored IG cookies to periodically fetch new stories.
5. The React UI requests stories from FastAPI, authenticated via JWT.

---

## Quick Start Guide (Manual Setup)

### Prerequisites
* Python 3.10+
* Node.js 18+
* Redis (Required for Celery background workers)
* PostgreSQL (Optional, defaults to SQLite if not provided)

### 1. Backend Setup

Open a terminal, navigate to the backend directory, create a virtual environment, and install dependencies:

```bash
cd techstack/backend
python -m venv venv

# Activate the environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

Start the FastAPI backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

Start the Celery worker (in a separate terminal, with venv activated):
```bash
celery -A app.worker worker --loglevel=info
```

### 2. Frontend Setup

Open a new terminal, navigate to the frontend directory, install dependencies, and start Vite:

```bash
cd techstack/frontend
npm install
npm run dev
```

Your MemWault dashboard will now be live at `http://localhost:5173`!
