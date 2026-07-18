# MemWault — Digital Memory Preservation & Archiving

> **Project Status:** v2.x 🚀

## 💡 What is MemWault?

MemWault is a private, local-first archive designed to permanently preserve, organize, and replay your Instagram stories outside of Meta's walled garden, while simultaneously serving as a self-hosted social media dashboard combining memories from multiple platforms into one unified timeline.

Over the last decade, Instagram Stories have become the default medium for documenting our daily lives. However, they suffer from two major flaws:
1. **Ephemeral by Design:** Stories disappear after 24 hours.
2. **Walled Garden Archive:** While Instagram archives your stories internally, your memories are locked inside Meta's ecosystem. If your account is restricted, hacked, or banned, decades of personal history—along with tagged friends, locations, music, and social context—are lost forever.

MemWault provides a personal, local-first archiving engine that downloads your stories, parses their rich metadata, and presents them in a beautiful, chronological timeline, combined with a private journaling layer that never alters the original metadata.

---

## 🚀 Core Features (v2.x)

* **Local-First Archiving:** Full ownership of your data using a local SQLite/PostgreSQL database and local media storage (or S3/MinIO), entirely bypassing Meta's API restrictions.
* **Interactive Map View:** See your memories geographically plotted on an interactive map. Features automatic clustering, bounding-box timeline filtering, and an immersive full-screen map mode toggle.
* **Custom Highlight Albums:** Curate and group your downloaded stories into custom Highlight Albums locally. Organize your existing local timeline stories effortlessly without touching the Instagram app.
* **Robust Full-Text Search:** A lightning-fast, backend-driven search engine using SQL `ILIKE` database queries. Instantly search your entire historical archive by location, caption, music title, or artist name without client-side loading limits.
* **Smooth Page & Layout Transitions:** Enjoy buttery-smooth page transitions (slide and fade) between tabs, and watch your media grid naturally glide and scale when zooming between Day, Month, and Year views.
* **Music Integrations & iTunes API:** Features a built-in Music mini-player that instantly streams high-quality 30-second previews from the iTunes API for the songs attached to your stories.
* **Advanced Story Segregation:** Automatically segregates "Reels reposted to Stories" so they don't clutter your organic memories.
* **Robust Archives (Trash):** Soft-delete/archive individual or bulk-selected stories from the main timeline. Archived stories are hidden from Memories and Reels but can be viewed and fully restored back to the timeline from the Archives page.

---

## 🔒 Authentication Architecture

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
4. Background tasks use the stored IG cookies to periodically fetch new stories.
5. The React UI requests stories from FastAPI, authenticated via JWT.

---

## 🛠️ Tech Stack & Architecture

MemWault is designed as a self-hosted full-stack application.

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

## 🚀 Quick Start Guide (Manual Setup)

> **Note:** The old `.bat` 1-click starter has been removed as it spawned too many unstable background windows. Please use the manual terminal commands below. (A Docker Compose quick start method is planned for the future!)

### Prerequisites
* Python 3.10+
* Node.js 18+

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

### 2. Frontend Setup

Open a second terminal, navigate to the frontend directory, install dependencies, and start Vite:

```bash
cd techstack/frontend
npm install
npm run dev
```

Your MemWault dashboard will now be live at `http://localhost:5173`!
