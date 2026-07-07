# MemWault — Digital Memory Preservation & Archiving

> **Project Status:** v1.0 (Functional Build) 🚀

MemWault is a digital memory preservation platform designed to help you permanently own, archive, and replay your Instagram Stories independently of Instagram.

---

## 💡 Why MemWault?

Over the last decade, Instagram Stories have become the default medium for documenting our daily lives. However, they suffer from two major flaws:
1. **Ephemeral by Design:** Stories disappear after 24 hours.
2. **Walled Garden Archive:** While Instagram archives your stories internally, your memories are locked inside Meta's ecosystem. If your account is restricted, hacked, or banned, decades of personal history—along with tagged friends, locations, music, and social context—are lost forever.

MemWault was created to solve this. It provides a personal, local-first archiving engine that downloads your stories, parses their rich metadata, and presents them in a beautiful, chronological timeline, combined with a private journaling layer that never alters the original metadata.

---

## ✨ Features

* **Chronological Timeline & Filters:** Browse your stories by date, or filter them by Photos, Videos, or Reels.
* **Interactive Map View:** See your memories geographically plotted. Features automatic clustering, bounding-box timeline filtering, and a "Top Cities" quick-filter.
* **Music Integrations:** Features a built-in Music mini-player that instantly streams high-quality 30-second previews from the iTunes API. It also dynamically generates "Open in App" links for Spotify, Apple Music, YouTube Music, or Amazon Music.
* **Web-Style Arrow Navigation:** Seamlessly glide through your chronological story history using left/right UI chevrons or your keyboard's arrow keys (just like Instagram Web).
* **Perpetual Viewer Tracking:** Automatically captures and permanently stores your story viewers just before the story expires. Viewers load dynamically with clickable links straight to their Instagram profiles.
* **Customizable Playback:** Fine-tune your experience with adjustable auto-play delays for video stories.

---

## 🛠️ Tech Stack & Architecture

MemWault is designed as a self-hosted or cloud-deployable full-stack application.

* **Frontend:** React + Vite PWA (Progressive Web App) styled with premium glassmorphic dark-mode CSS.
* **Backend:** FastAPI (Python) web server providing a REST API.
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
│   │   └── requirements.txt
│   ├── frontend/          # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/     # Dashboard, Timeline, Settings
│   │   │   └── services/  # API service client
│   │   └── package.json
│   └── docker-compose.yml # Dev environment (Postgres, Redis, MinIO)
├── V1_FEATURE_SPEC.md     # Scope and roadmap for the V1 release
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

* **Swagger UI (`http://localhost:8000/docs`):** A web interface listing all available REST API endpoints. You can expand any route (like `/instagram/login` or `/stories`) and click **"Try it out"** to send requests and inspect responses directly from your web browser.
* **ReDoc (`http://localhost:8000/redoc`):** An alternative, beautifully structured schema documentation layout.
* **Health Check (`http://localhost:8000/health`):** A quick checkpoint endpoint that returns `{"status": "ok"}` to confirm the API server is alive and communicating.

---

## 🔐 Authentication Architecture (How it Works)

Connecting an Instagram account to a self-hosted archiver used to be notoriously difficult due to Meta's aggressive anti-scraping and bot-detection systems (blocking residential IP logins, breaking on Facebook-linked accounts, and flagging manual session cookies).

To solve this, MemWault uses **Browser Automation via Playwright**.

### The Flow:
1. **Real Browser:** When you click "Connect with Instagram," the backend spins up a visible, interactive Chromium browser on your computer.
2. **Direct Login:** The browser navigates to the official Instagram login page. You log in manually (handling 2FA, Facebook-linked accounts, etc., perfectly).
3. **Cookie Extraction:** Once logged in, MemWault intercepts the browser session and extracts the complete cookie jar (including `sessionid`, `csrftoken`, `mid`, `ig_did`, and `ds_user_id`) along with the exact `User-Agent`.
4. **Headless Scraping:** Future API calls to sync your stories use these exact cookies and headers. To Instagram, the scraping requests look 100% identical to the browser tab you just used to log in.

This provides the most secure, stable, and user-friendly authentication possible for self-hosted instances.
