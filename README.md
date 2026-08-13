# MemWault — Digital Memory Preservation & Archiving

<p align="center">
  <img src="screenshots/The dashboard home screen.jpg" alt="MemWault Main Dashboard" width="100%" style="border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

<p align="center">
  <a href="#key-features"><b>Key Features</b></a> •
  <a href="#visual-tour"><b>Visual Tour</b></a> •
  <a href="#quickstart"><b>Quickstart</b></a> •
  <a href="#architecture"><b>Architecture</b></a> •
  <a href="#license"><b>License</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v2.4-0A84FF?style=for-the-badge&logo=appstore&logoColor=white" alt="Version 2.4" />
  <img src="https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Framer%20Motion-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="Frontend React" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.12-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Backend FastAPI" />
  <img src="https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="Database" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local--First-34C759?style=for-the-badge&logo=lock&logoColor=white" alt="Local First" />
</p>

---

## 🌟 What is MemWault?

**MemWault** is a private, local-first digital archive engineered to permanently preserve, organize, and replay your personal Instagram stories, reels, and social memories. It guarantees 100% personal data portability by operating as a self-hosted memory vault with liquid continuous timeline zooming, sidecar markdown journaling, spatial geographic mapping, and iTunes music stream integration.

---

## ✨ Key Features

- 📅 **Continuous Semantic Zoom Timeline:** Transition seamlessly between **Years**, **Months**, and **Days** zoom states using Framer Motion liquid spring physics.
- 📖 **Meaning-Making Markdown Journaling:** Attach rich markdown journal notes directly to your memories. Notes auto-sync as `.md` sidecar files right next to your media files on disk.
- 🗺️ **Spatial Story Map:** Explore your memories geographically on an interactive Leaflet map featuring spatial clustering and bounding-box search.
- 🎨 **Custom Highlight Albums:** Group your local stories into custom albums with dynamic 4-image grid covers, video thumbnails, and local cover uploads.
- 🎵 **iTunes Music Integration:** Built-in mini-player that streams 30-second high-fidelity previews for songs attached to your stories.
- ⚡ **FastScrollbar Chronological Scrubbing:** Drag through years of historical memories in milliseconds with high-frequency timeline scrubbing.
- 🔒 **100% Private & Self-Hosted:** All database records, media assets, and metadata reside exclusively on your local storage drive or personal S3 bucket.

---

## 📸 Visual Tour

### 1. Dashboard & Continuous Timeline

<table align="center" width="100%">
  <tr>
    <td width="50%" align="center">
      <b>Dashboard & Analytics Overview</b><br/>
      <img src="screenshots/The dashboard home screen.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Live stats, total story counts, storage consumption, and system status</sub>
    </td>
    <td width="50%" align="center">
      <b>Dedicated Reels Gallery</b><br/>
      <img src="screenshots/The reels tab.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Automatically segregated reels view with date headers and duration badges</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>Memories Timeline (Months Zoom)</b><br/>
      <img src="screenshots/The memories tab in the month selector is on.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Clean grid layout morphing with liquid spring 3-pill zoom control</sub>
    </td>
    <td width="50%" align="center">
      <b>Memories Timeline (Days Zoom)</b><br/>
      <img src="screenshots/The memory have when particular days zoom is on.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Granular day-by-day view with high-res aspect ratio media cards</sub>
    </td>
  </tr>
</table>

---

### 2. Memory Studio & Sidecar Journaling

<table align="center" width="100%">
  <tr>
    <td width="50%" align="center">
      <b>Sidecar Markdown Journal Editor</b><br/>
      <img src="screenshots/Journal of a memory.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Write rich markdown notes auto-synced as .md sidecar files next to media on disk</sub>
    </td>
    <td width="50%" align="center">
      <b>Memory Info & EXIF Metadata</b><br/>
      <img src="screenshots/Info tab of a memory.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Detailed EXIF metadata, capture timestamp, duration, and local file paths</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>iTunes Music Preview Player</b><br/>
      <img src="screenshots/Music tab of a memory.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Stream 30-second audio previews for soundtrack attached to your memory</sub>
    </td>
    <td width="50%" align="center">
      <b>Data Manifest & JSON Export</b><br/>
      <img src="screenshots/Data page of the memories of a memory.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Inspect raw JSON payload, story ID, and system data properties</sub>
    </td>
  </tr>
</table>

---

### 3. Custom Highlight Albums & Spatial Map

<table align="center" width="100%">
  <tr>
    <td width="50%" align="center">
      <b>Highlight Albums Gallery</b><br/>
      <img src="screenshots/The highlights tab.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Curated collections with dynamic 4-image grid covers and album titles</sub>
    </td>
    <td width="50%" align="center">
      <b>Highlight Player & Audio Stream</b><br/>
      <img src="screenshots/A particular highlight with the music and enabled.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Full-screen story playback inside custom highlight albums with music</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>Opened Highlight Collection</b><br/>
      <img src="screenshots/After opening up a highlight.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Explore stories inside a specific highlight album</sub>
    </td>
    <td width="50%" align="center">
      <b>Album Options & Controls</b><br/>
      <img src="screenshots/Three dots menu of a highlight.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Quick management actions, cover edits, and story additions</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>Spatial Map (Split Grid View)</b><br/>
      <img src="screenshots/Map in the bento grid.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Interactive spatial map with location pins and bento place cards</sub>
    </td>
    <td width="50%" align="center">
      <b>Spatial Map (Fullscreen View)</b><br/>
      <img src="screenshots/Map full screen.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Immersive full-screen geographic map view</sub>
    </td>
  </tr>
</table>

---

### 4. Settings, Maintenance & Archives

<table align="center" width="100%">
  <tr>
    <td width="50%" align="center">
      <b>Settings & Instagram Connection</b><br/>
      <img src="screenshots/Settings page first as we open the settings page.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Instagram session management, theme controls, and map style toggles</sub>
    </td>
    <td width="50%" align="center">
      <b>Scrape Logs & Maintenance</b><br/>
      <img src="screenshots/Data scrape history in the settings tab.jpg" width="100%" style="border-radius: 8px;" /><br/>
      <sub>Scrape execution history, local folder opener, and metadata rescanning</sub>
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center">
      <b>Archives & Trash Recovery</b><br/>
      <img src="screenshots/Archives tab.jpg" width="80%" style="border-radius: 8px;" /><br/>
      <sub>Soft-delete trash manager for restoring or permanently deleting archived stories</sub>
    </td>
  </tr>
</table>

---

## 🛠️ Architecture & Tech Stack

```text
MemWault Workspace
├── techstack/
│   ├── backend/           # FastAPI async server, SQLite/PostgreSQL models
│   │   ├── app/
│   │   │   ├── api/       # REST API endpoints (Auth, Stories, Storage)
│   │   │   ├── scraper/   # Instagram browser login & scraper engine
│   │   │   └── models.py  # SQLAlchemy database schemas
│   │   └── requirements.txt
│   └── frontend/          # React 18 + Vite PWA frontend
│       ├── src/
│       │   ├── components/# Framer Motion components (FastScrollbar, StoryCard)
│       │   ├── pages/     # Timeline, StoryDetail, MapView, Settings
│       │   └── services/  # API service client
│       └── package.json
├── screenshots/           # HD UI screenshots showcase
└── README.md
```

- **Frontend:** React 18, Vite, Framer Motion, Leaflet.js, Lucide Icons
- **Backend:** FastAPI, Python 3.12, SQLAlchemy 2.0, Playwright, Instagrapi
- **Storage:** Local Drive / S3 Compatible Object Storage (MinIO / AWS)

---

## 🚀 Quickstart

### 1. Start the Backend Server
```bash
cd techstack/backend
python -m venv venv
.\venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Start the Frontend Application
```bash
cd techstack/frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your web browser.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.
