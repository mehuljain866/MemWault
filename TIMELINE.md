# 📅 MemWault Project Timeline (Detailed Historical Archive)

This document tracks the exhaustive, day-by-day, minute-by-minute evolution of MemWault from its inception, preserving all historical context, feature specs, and architectural decisions.

---

## 💡 Project Inception & Lost Context (July 2, 2026)
**Background & Ideation:**
The project started with a massive ideation phase documented in the `ideas/` folder (later removed to clean the repo). The core concept was to break free from Meta's walled garden and build a permanent, local-first archive for Instagram stories. The original specifications included a comprehensive Whitepaper (`whitepaper_verdict.md`), a feature spec (`V1_FEATURE_SPEC.md`), and Notebook LM feature lists.
The decision was made to build a self-hosted platform called **MemWault** using a highly concurrent FastAPI backend, a React+Vite PWA frontend, and an aggressive metadata pipeline that burns context (locations, music, tags) directly into files via XMP metadata.

---

## July 02, 2026
* **11:19 PM - System Action / Commit:** Initial commit: MemWault memory preservation engine
  * *Modified components:* `.gitignore, LICENSE, README.md, ...Branch-\302\267-Digital-Memory-Preservation.md", ideas/V1_FEATURE_SPEC.md, and 41 more files...`
* **11:22 PM - System Action / Commit:** Remove ideas folder and development timeline
  * *Modified components:* `...Branch-\302\267-Digital-Memory-Preservation.md", ideas/V1_FEATURE_SPEC.md, ideas/notebook lm featurlist.txt, ideas/whitepaper_verdict.md, timeline.md`

---

## July 03, 2026
* **07:22 PM - System Action / Commit:** feat: implement Playwright-based browser login for Instagram
  * *Modified components:* `README.md, techstack/backend/app/api/routes.py, techstack/backend/app/main.py, techstack/backend/app/schemas.py, techstack/backend/app/scraper/browser_login.py, and 4 more files...`
* **07:29 PM - System Action / Commit:** docs: update authentication architecture section
  * *Modified components:* `README.md`
* **07:32 PM - System Action / Commit:** docs: create project timeline document
  * *Modified components:* `TIMELINE.md`

---

## July 04, 2026
* **11:00 AM - System Action / Commit:** feat: add start.bat for one-click windows setup and launch
  * *Modified components:* `start.bat`
* **11:02 AM - System Action / Commit:** docs: add 1-click start.bat instructions to README
  * *Modified components:* `README.md`
* **11:09 AM - System Action / Commit:** fix: make instagram web api story parsing null-safe
  * *Modified components:* `techstack/backend/app/scraper/instagram.py`

---

## July 05, 2026
* **07:59 PM - System Action / Commit:** Fix scrape bugs, reconstruct IG layout engine, add TextStickers, fix archive auth and video playback
  * *Modified components:* `techstack/backend/app/api/routes.py, techstack/backend/app/main.py, techstack/backend/app/scraper/instagram.py, techstack/backend/app/scraper/tasks.py, techstack/frontend/src/components/Header.jsx, and 5 more files...`

---

## July 07, 2026
* **05:52 PM - System Action / Commit:** UI tweaks and improved text sticker detection
  * *Modified components:* `.gitignore, removed_features.md, techstack/backend/app/api/routes.py, techstack/backend/app/scraper/instagram.py, techstack/backend/app/scraper/metadata.py, and 7 more files...`
* **10:54 PM - System Action / Commit:** feat: Maps, Music Integrations, Viewers Fix, and Arrow Navigation  - Add Interactive Map View (clusters, geolocation overlay) - Add Music Player preview and external App launching - Add Playback settings (delay and app preference) - Fix Viewers scraping syncing to database correctly - Add chronological left/right arrow navigation to Story Detail - Update UI for Viewers (clickable Instagram profile links)
  * *Modified components:* `ideas.md, techstack/backend/app/api/routes.py, techstack/backend/app/models.py, techstack/backend/app/schemas.py, techstack/backend/app/scraper/instagram.py, and 530 more files...`
* **10:59 PM - System Action / Commit:** chore: Update README to v1.0 and document new features
  * *Modified components:* `README.md`
* **11:00 PM - System Action / Commit:** docs: update TIMELINE.md for v1.0 milestone
  * *Modified components:* `TIMELINE.md`
* **11:03 PM - System Action / Commit:** docs: update TIMELINE.md with actual calendar dates
  * *Modified components:* `TIMELINE.md`

---

## July 08, 2026
* Goal:** Address edge cases in UI rendering, fix visual consistency across tabs, and squash media syncing bugs.
* 01:00 AM - Data Tab Overflow Fix:** Fixed a massive layout bug in the `StoryDetail` Data tab where large JSON payloads caused infinite width scrolling. Applied `minWidth: 0` flex constraints and `pre-wrap` styling to correctly contain the raw manifest data.
* 01:15 AM - MapView Header Polish:** Redesigned the date headers in the Map Split-Screen view. Replaced the generic headers with floating Apple-style glassmorphic date bubbles to match the aesthetics of the Memories page.
* 01:30 AM - Fast Scroll Navigation:** Built and integrated a new `FastScrollbar.jsx` component into both the Timeline and Map views, allowing users to rapidly drag through chronological history rather than scrolling manually.
* 01:45 AM - Media Sync Diagnosis (467 Client Error):** Investigated why the newest uploaded stories were appearing as "Image Error" placeholders. Discovered that the backend Instagram session (cookies) had expired, preventing media downloads. Wrote repair scripts and built a flow to prompt users to reconnect their session when downloads fail.
* 02:00 AM - Location Modal Fullscreen Fix:** Repaired the "Edit Location" map UI which was failing to maximize properly. Upgraded CSS from static viewport units (`100vh`) to dynamic viewport heights (`100dvh`) and removed `maxWidth` constraints to perfectly emulate the Apple Photos bottom-sheet map experience.
* 02:15 AM - Manual Reel Toggling:** Encountered edge cases where Instagram's API obfuscates reshared reels in new sticker formats, bypassing the auto-detection. Added a manual "Mark as Reel / Unmark as Reel" toggle directly into the `StoryDetail` Info tab so users can easily filter out accidental reels from their organic memories.
* 02:30 AM - Environment Restoration:** Automatically re-initialized the Uvicorn backend and Vite frontend environments following a server restart to bring the app back online.

---

*(This timeline is continuously updated with exact, timestamped precision as the project evolves.)*
