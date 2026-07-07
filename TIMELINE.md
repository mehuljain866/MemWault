# 📅 MemWault Project Timeline

This document tracks the day-by-day evolution of MemWault—from the initial ideation phase to our current architecture. It serves as a historical record of our progress, the challenges we faced, and the technical pivots we made.

---

## Day 1: Ideation & Foundation
**Goal:** Break free from Meta's walled garden and build a permanent, local-first archive for Instagram stories.
* **Concept Finalized:** Decided to build a self-hosted platform (MemWault) that automatically polls, downloads, and archives Instagram stories along with their rich metadata (music, tagged friends, locations).
* **Tech Stack Selected:** 
  * Frontend: React + Vite PWA for a fast, app-like experience.
  * Styling: Premium glassmorphic dark mode with Vanilla CSS.
  * Backend: FastAPI (Python) for a highly concurrent REST API.
  * Database: SQLite for local dev, built on SQLAlchemy ORM.
  * Infrastructure: Dockerized PostgreSQL, Redis, and MinIO for production.
* **Initial Setup:** Scaffolded the initial directory structure, basic API routes, database models, and the Vite frontend.

---

## Day 2: The Core Engine & The Roadblock
**Goal:** Build out the scraping logic and the frontend user interfaces.
* **Frontend UI:** Built the Dashboard layout, the Timeline for viewing stories chronologically, and the initial Settings page with a 3-field login form (username/password/session ID).
* **Scraping Engine:** Wrote the initial `InstagramScraper` module intended to use private API emulation and manual cookie entry.
* **The Roadblock (The Scraping Challenge):** We hit a massive wall with Meta's bot detection. 
  * Simple API logins were instantly blocked or required constant IP/device verifications.
  * Accounts linked to Facebook could not log in via standard password APIs.
  * Manual session cookies transferred from the browser to the backend were frequently flagged due to fingerprint and User-Agent mismatches.
* **Pivot Decision:** Realized that relying on private APIs or manual cookie entry was not scalable or user-friendly for a mass-market audience.

---

## Day 3: The Playwright Revolution (The Breakthrough)
**Goal:** Build a bulletproof, "Beeper-style" authentication flow that just works.
* **Browser Automation:** completely rewrote the login flow to use **Microsoft Playwright**. Instead of relying on APIs, clicking "Connect" now spins up a real, visible Chromium browser window on the user's local machine.
* **Direct Login & Extraction:** Users now log in exactly as they would on the official Instagram website (easily bypassing 2FA and Facebook-linked blocks). Once logged in, the backend instantly intercepts the session and extracts the complete "cookie jar" (including `sessionid`, `csrftoken`, `mid`, `ig_did`, and `ds_user_id`) along with the exact browser `User-Agent`.
* **Bulletproof Requests:** Updated the scraper engine to use these exact browser fingerprints for all future background scraping, completely bypassing Instagram's bot detection.
* **Frontend Overhaul:** Removed the confusing 3-field form in the Settings page and replaced it with a single, elegant "Connect with Instagram" button featuring a pulse loading animation.
* **Bug Squashing:** Diagnosed and fixed a deep Python `asyncio` conflict (`NotImplementedError`) on Windows by spinning Playwright off into a separate thread pool with a dedicated `ProactorEventLoop`, allowing it to run flawlessly alongside the FastAPI server.

---

---

## Day 4: Architecture Scaling & Metadata Mastery
**Goal:** Expand the data models to support rich media, locations, and permanent metadata preservation.
* **Database Evolution:** Migrated the SQLite database schema to support crucial new fields: `location_lat`, `location_lng`, `location_name`, `duration_ms`, `has_audio`, and a strict boolean `is_reel` flag.
* **XMP Injection (The Permanent Backup):** Implemented an aggressive ExifTool backend pipeline. Every downloaded story now has its Instagram metadata (location, timestamp, duration) permanently burned directly into the `.mp4` or `.jpg` file using XMP namespaces. Even if the MemWault database is deleted, the file itself retains all its historical context.
* **Reels Segregation:** Upgraded the scraper logic to successfully identify and isolate "Reels reposted to Stories", segregating them into a dedicated Reels tab on the frontend timeline so they don't clutter the organic memories.
* **Timeline Overhaul:** Grouped stories visually by Date on the frontend Timeline to make scrolling through hundreds of stories intuitive and nostalgic.

---

## Day 5: The Interactive Archive (v1.0 Milestone)
**Goal:** Transform the raw archive into an interactive, premium media experience and hit the v1.0 milestone.
* **Interactive Map View:** Integrated `react-leaflet` to build a fullscreen Map View. Built dynamic clustering to handle hundreds of location-tagged stories without lagging the browser. Added bounding-box logic so the chronological timeline strictly filters itself based on where you are zoomed in on the map.
* **Music Integrations & iTunes API:** Created a custom inline `<audio>` Music Player inside the Story Detail view. Integrated the iTunes Search API to dynamically stream 30-second high-quality previews of the song playing in the background of a story. Built dynamic "Open in App" deep links supporting Spotify, Apple Music, YouTube Music, and Amazon Music.
* **Perpetual Viewer Tracking:** Patched the Celery background worker to query Instagram for the story's Viewer List exactly 5 minutes before the story natively expires on Instagram's servers. The viewer list is saved perpetually in the local DB. Upgraded the Viewers UI to directly hotlink Instagram CDN profile pictures and usernames.
* **Keyboard Navigation:** Implemented Instagram Web-style left/right chronological arrow navigation (both via on-screen SVG chevrons and physical keyboard arrow keys) for seamless rapid-fire viewing.
* **Launch:** Officially marked the project as a v1.0 Functional Build! 🚀

---

*(This timeline will be continuously updated as new features, bug fixes, and milestones are achieved!)*
