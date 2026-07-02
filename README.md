# MemWault — Digital Memory Preservation & Archiving

> **Project Status:** Pre-v1.0 (Active Development). We are working towards our first functional build.

MemWault is a digital memory preservation platform designed to help you permanently own, archive, and replay your Instagram Stories independently of Instagram.

---

## 💡 Why MemWault?

Over the last decade, Instagram Stories have become the default medium for documenting our daily lives. However, they suffer from two major flaws:
1. **Ephemeral by Design:** Stories disappear after 24 hours.
2. **Walled Garden Archive:** While Instagram archives your stories internally, your memories are locked inside Meta's ecosystem. If your account is restricted, hacked, or banned, decades of personal history—along with tagged friends, locations, music, and social context—are lost forever.

MemWault was created to solve this. It provides a personal, local-first archiving engine that downloads your stories, parses their rich metadata, and presents them in a beautiful, chronological timeline, combined with a private journaling layer that never alters the original metadata.

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

Follow these steps to set up the local FastAPI server and React frontend on your computer.

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

## 🚨 The Instagram Scraping Challenge (Call for Collaboration)

Connecting an Instagram account to a self-hosted archiver is notoriously difficult due to Meta's aggressive anti-scraping and bot-detection systems. We are currently facing the following roadblocks and are **actively looking for help, advice, or collaboration** from the developer community:

### 1. Mobile API & IP Blacklisting
When using private API emulation libraries (like `instagrapi`), logins to the mobile API endpoints (`i.instagram.com/api/v1/accounts/login/`) from residential IP addresses are heavily flagged. This triggers immediate blocks requesting the user to "change their IP address" or complete security verifications.

### 2. Facebook-Linked Accounts
For Instagram accounts linked to Facebook Accounts Center, password login attempts via private APIs frequently fail with:
> *Instagram login failed: You can log in with your linked Facebook account.*

Instagram forces these logins to go through Facebook's secure OAuth flow. Because private API libraries only submit standard password credentials, they cannot complete the OAuth handshake and get stuck.

### 3. Session ID (Cookie) Authentication
To bypass password login, we've implemented a **Session ID (browser cookie) bypass** that communicates directly with Instagram's Web API using browser headers. While this avoids standard mobile login checks, it is still vulnerable to:
* Session cookies expiring unexpectedly.
* Rate limits or security checkpoints triggered during periodic background story syncs.
* Fingerprint/user-agent mismatch flags when the cookie is transferred from a browser to the server environment.

### 💬 Do you know a better way?
If you have experience with:
* Bypassing or handling Instagram's login challenges programmatically.
* Simulating stable browser environments or managing cookies/user-agents effectively.
* Implementing official Graph API workarounds for personal archiving.
* Building residential/mobile proxy rotation configurations for small-scale projects.

Please open an issue, submit a PR, or reach out! We would love to collaborate on making personal memory preservation reliable.
