# MemWault - Agent Handoff Document

This document is continuously updated to provide full context for any new agent or session resuming work on the MemWault project.

## 1. Project Overview
**MemWault** (v2.4) is a private, local-first archive designed to permanently preserve, organize, and replay Instagram stories outside of Meta's ecosystem. It acts as a self-hosted social media dashboard combining memories, custom highlights, map views, and rich text journaling.

## 2. Tech Stack & Architecture
* **Frontend:** React, Vite, Tailwind/Vanilla CSS, Framer Motion, Leaflet JS (PWA).
* **Backend:** FastAPI (Python), SQLAlchemy 2.0 (async), SQLite (local dev), Uvicorn.
* **Workers:** Celery + Redis for scraping (via `instagrapi`).
* **Storage:** Local file system or S3/MinIO.
* **Metadata Engine:** Custom Python wrappers around ExifTool to inject universal metadata natively into `.jpg` and `.mp4` headers.

## 3. Current State & Recent Accomplishments
* **Version 2.4 - Engagement & Privacy Update:** Recently completed.
* **Perpetual Engagement Metrics:** Integrated `viewer_count` and `like_count` fetching from Instagram's archive (bypassing the dangerous 48hr viewer lists API). This is saved in DB and EXIF.
* **EXIF "God Tag":** Whenever a Markdown Journal Note is saved in the app, the backend silently runs ExifTool to inject a beautifully formatted block (Caption, Journal, Music, Location, Views/Likes, Tags) directly into the file's `ImageDescription`, `Title`, and `Description` EXIF tags so they show natively in iOS/Google Photos swipe-up menus.
* **Locate Button Fix:** Fixed a subtle Windows Explorer bug where a trailing space in `subprocess.Popen` caused the `Locate` button to open Documents instead of highlighting the exact media file.

## 4. Current Context & Unresolved Issues
* **Server Status:** Servers were just restarted. Backend (`uvicorn app.main:app --reload`) and Frontend (`npm run dev`) must be run to test the application.
* **Likers List Scraping:** The idea to emulate an iOS device to scrape the permanent list of likers from the private `media/{id}/likers/` API has been intentionally placed **ON HOLD** in `feature_ideas_research.md` due to ToS compliance and account ban risks. The user opted for zero risk.

## 5. Next Steps
* Awaiting the user's next directive. They are likely testing the newly fixed "Locate" button in Windows Explorer and the EXIF swipe-up metadata format.

---
*Last Updated: 2026-07-20*
