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

*(This timeline will be continuously updated as new features, bug fixes, and milestones are achieved!)*
