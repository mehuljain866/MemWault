# MemWault — Digital Memory Preservation & Archiving

> **Project Status:** v2.2 (The Highlights & Archive Update) 🚀

MemWault is a digital memory preservation platform designed to help you permanently own, archive, and replay your Instagram Stories independently of Meta's ecosystem.

---

## 💡 Why MemWault?

Over the last decade, Instagram Stories have become the default medium for documenting our daily lives. However, they suffer from two major flaws:
1. **Ephemeral by Design:** Stories disappear after 24 hours.
2. **Walled Garden Archive:** While Instagram archives your stories internally, your memories are locked inside Meta's ecosystem. If your account is restricted, hacked, or banned, decades of personal history—along with tagged friends, locations, music, and social context—are lost forever.

MemWault was created to solve this. It provides a personal, local-first archiving engine that downloads your stories, parses their rich metadata, and presents them in a beautiful, chronological timeline, combined with a private journaling layer that never alters the original metadata.

---

## ✨ What's New in Version 2.2 (The Highlights Update)

* **Highlights & Albums Integration:** Curate and group your downloaded stories into custom Highlight Albums locally. This bypasses Meta's API restrictions by letting you organize your existing local timeline stories effortlessly.
* **Intelligent Fuzzy Search:** A lightning-fast, client-side fuzzy search engine (powered by `fuse.js`) available globally on the Timeline and Highlight Creator. Instantly filter thousands of memories by location, music, artist, or caption.
* **Map View Immersive Toggle:** Easily switch between full-screen immersive map mode and a constrained "Bento plane" layout to fit your workflow.
* **Fluid Page & Layout Transitions:** Entirely rewritten routing shell and grid engine using React Router and Framer Motion. Enjoy buttery-smooth iOS page transitions (slide and fade) between tabs, and watch your media grid naturally glide and scale when zooming between Day, Month, and Year views.
* **Robust Media Sync & S3 URLs:** Improved backend APIs that dynamically generate pre-signed S3 URLs for Highlights, ensuring your covers and story media load perfectly even in decoupled storage environments.

## 🚀 Version 2.0 Features

* **Premium UI Overhaul:** A massive interface upgrade featuring dynamic glassmorphic date bubbles, responsive split-screen layouts, and a clean, modern design system.
* **Interactive Map View & Clustering:** See your memories geographically plotted. Features automatic clustering, bounding-box timeline filtering, and immersive/split-screen toggle modes.
* **Rapid Chronological Navigation:** Built-in `FastScrollbar` allows you to seamlessly drag and jump through months or years of memories in milliseconds, replacing tedious manual scrolling.
* **Music Integrations & iTunes API:** Features a built-in Music mini-player that instantly streams high-quality 30-second previews from the iTunes API.
* **Advanced Story Segregation:** Automatically segregates "Reels reposted to Stories" so they don't clutter your organic memories.

## 💾 Core Platform Features

* **Perpetual Viewer Tracking:** Automatically captures and permanently stores your story viewers just before the story expires. Viewers load dynamically with clickable links straight to their Instagram profiles.
* **Web-Style Arrow Navigation:** Seamlessly glide through your chronological story history using left/right UI chevrons or your keyboard's arrow keys.
* **Customizable Playback:** Fine-tune your experience with adjustable auto-play delays for video stories and configurable global themes.

---

## 🛠️ Tech Stack & Architecture

MemWault is designed as a self-hosted or cloud-deployable full-stack application.

* **Frontend:** React + Vite PWA (Progressive Web App) styled with premium modern CSS.
* **Backend:** FastAPI (Python) web server providing a highly concurrent REST API.
* **Database:** SQLite (local development) / PostgreSQL (production) running SQLAlchemy ORM.
* **Background Workers:** Celery + Redis for scheduled story polling and scraping tasks.
* **Storage:** Local directory structure / S3-compatible object storage (MinIO) for storing downloaded media.

### Repository Layout

```
MemWault/
├── techstack/
│   ├── backend/           # FastAPI backend & Instagram scraper
│   │   ├── app/
│   │   │   ├── api/       # API endpoints (Auth, Stories, Session)
│   │   │   ├── scraper/   # Story scraping & metadata parser
│   │   │   └── storage/   # S3/Local media storage client
│   │   └── requirements.txt # Python dependencies
│   ├── frontend/          # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/# React UI Components (FastScrollbar, StoryPlayer)
│   │   │   ├── pages/     # Dashboard, Timeline, MapView, Settings, StoryDetail
│   │   │   └── services/  # API service client
│   │   └── package.json   # Node.js dependencies
│   └── docker-compose.yml # Dev environment (Postgres, Redis, MinIO)
└── README.md              # This file
```

---

## 🚀 Quick Start Guide

### ⚡ Windows 1-Click Starter (Easiest)
If you are on Windows, simply double-click the **`start.bat`** file in the root folder! 
It will automatically setup your Python environment, install all dependencies, download the Playwright browser, and launch both the Backend API and Frontend UI simultaneously in new terminal windows.

---

### 🛠️ Manual Setup

Follow these steps to set up the local FastAPI server and React frontend manually.

### Prerequisites
* Python 3.10+
* Node.js 18+
* Docker (Optional, for running PostgreSQL, Redis, and MinIO locally)

### 1. Backend Setup

Open a terminal, navigate to the backend directory, create a virtual environment, and install dependencies:

```bash
cd techstack/backend
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Install browser engine for Instagram login
playwright install chromium

# Create your environment configuration file
cp .env.example .env
```
*Note: Make sure to edit the newly created `.env` file to configure your local database and storage options.*

### 2. Start Infrastructure (Docker)

If you wish to run the full stack dependencies locally (Postgres database, Redis queue, and MinIO storage bucket), launch Docker Compose from the `techstack/` directory:

```bash
cd techstack
docker-compose up -d postgres redis minio
```

### 3. Run the API Server

Start the local FastAPI development server:

```bash
cd techstack/backend
uvicorn app.main:app --reload --port 8000
```
*The server will start running locally at `http://localhost:8000`.*

### 4. Frontend Setup

Open a new terminal window, navigate to the frontend directory, install Node modules, and run the Vite dev server:

```bash
cd techstack/frontend
npm install
npm run dev
```
*The React application will start running at `http://localhost:5173/`.*

### 5. Start Polling Workers (Celery)

To enable automatic background story checking and downloading, run the Celery worker and scheduler in separate terminal sessions (ensure your virtual environment is activated):

```bash
cd techstack/backend
# Start the task queue worker
celery -A app.scraper.tasks worker --loglevel=info

# Start the periodic task scheduler
celery -A app.scraper.tasks beat --loglevel=info
```

---

## 📋 API Interactive Documentation

Once your backend server is running (Step 3), FastAPI automatically generates interactive documentation for developers:

* **Swagger UI (`http://localhost:8000/docs`):** A web interface listing all available REST API endpoints. You can expand any route and click **"Try it out"** to send requests and inspect responses directly from your web browser.
* **ReDoc (`http://localhost:8000/redoc`):** An alternative, beautifully structured schema documentation layout.
* **Health Check (`http://localhost:8000/health`):** A quick checkpoint endpoint that returns `{"status": "ok"}` to confirm the API server is alive and communicating.

---

## 🔐 Authentication Architecture (How it Works)

Connecting an Instagram account to a self-hosted archiver used to be notoriously difficult due to Meta's aggressive anti-scraping and bot-detection systems.

To solve this, MemWault uses **Browser Automation via Chrome Extensions & Playwright**.

### The Flow:
1. **Real Browser / Extension:** You use our custom Chrome extension or a real browser to log in securely. You handle 2FA, Facebook-linked accounts, etc., perfectly naturally.
2. **Cookie Extraction:** Once logged in, the session intercepts and extracts the complete cookie jar (including `sessionid`, `csrftoken`, `mid`, `ig_did`, and `ds_user_id`) along with the exact `User-Agent`.
3. **Headless Scraping:** Future API calls to sync your stories use these exact cookies and headers. To Instagram, the scraping requests look identical to your real browser session.

This provides the most secure, stable, and user-friendly authentication possible for self-hosted instances.
