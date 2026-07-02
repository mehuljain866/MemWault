# MemWault — Project Development Timeline

This document acts as an on-device commit and milestones log, mapping the history, decisions, architecture changes, and debug cycles of MemWault (formerly StoryVault).

---

## 📅 Project Milestones & Development History

### Phase 1: Inception & Brainstorming (GPT Brainstorming)
* **Goal:** Design a robust, personal digital memory preservation system specifically focused on archiving Instagram Stories before they disappear in the 24-hour window.
* **Brainstorming Outcomes:**
  - Defined the **Memory Object Model (MOM)** to store rich metadata (GPS, mentions, links, media, tags, music) rather than just raw video/images.
  - Determined that AI features, auto-sharing, and advanced analytics would be deferred (non-goals for V1) to focus on privacy and reliability.
  - Decided to create a **timeline-first UI** (glassmorphic dark theme) rather than a traditional stats dashboard.
  - Agreed to use **FastAPI (Python)** for the API engine and **React (Vite) PWA** for the frontend, with Celery worker polling in the background.

---

### Phase 2: Core Implementation & Schema Setup
* **Milestones:**
  - Initialized SQLite database (`memwault.db`) and PostgreSQL mappings for production.
  - Defined SQLAlchemy database schemas in `models.py` matching the MOM specification.
  - Built the `instagrapi` wrapper for story scraping (`app/scraper/instagram.py`).
  - Implemented S3/MinIO/Local media download modules.
  - Created the Vite + React client app, implementing authentication, timeline views, detail pages, and connection settings.

---

### Phase 3: The Instagram Authentication War (Major Troubleshooting Logs)
Connecting a personal, self-hosted archiver to Instagram triggered a sequence of anti-bot protections. Below is the chronicle of how they were addressed:

#### 1. The Mobile API IP Blacklist Block
* **Symptom:** Connecting via username/password threw an error: *"Instagram login failed: You can log in with your linked Facebook account. If you are sure that the password is correct, then change your IP address, because it is added to the blacklist..."*
* **Root Cause:** Instagram's mobile app login endpoint (`i.instagram.com/api/v1/accounts/login/`) heavily blacklists residential IP addresses when accessed by automated scripts.
* **Resolution:** Switched to a Web API browser cookie bypass using the user's `sessionid` cookie directly from their browser, eliminating the need to send credentials.

#### 2. The JSONDecodeError (HTML Challenge Block)
* **Symptom:** Scraper crashed with `JSONDecodeError (Expecting value: line 1 column 1 (char 0))`.
* **Root Cause:** When blocked, Instagram returns an HTML challenge verification page instead of the expected JSON response. The `instagrapi` library attempted to parse this HTML as JSON, crashing the application.
* **Resolution:** Rewrote the scraper's parsing methods to gracefully catch non-JSON responses and throw readable validation messages.

#### 3. The Lazy Initialization Connection Bug
* **Symptom:** Even when the user entered a Session ID and left the password blank, the backend still threw the "IP blacklist" error.
* **Root Cause:** In the initial setup, `InstagramScraper`'s `__init__` constructor unconditionally instantiated `InstaClient()` (the mobile app engine), which automatically executed background calls to Instagram mobile launcher endpoints, triggering the blacklist error.
* **Resolution:** Modified `InstagramScraper` to lazily initialize the `InstaClient` (`self._client = None`). The mobile client is now *never* instantiated if a Session ID is provided.

---

### Phase 4: Consolidating and Renaming
* **Consolidation:** Merged backend configuration and setup documentations into a single, cohesive, master root-level [README.md](./README.md) explaining how to configure local dev, run Docker compose, run FastAPI, and access interactive Swagger docs.
* **Global Refactoring (StoryVault ➡️ MemWault):**
  - Performed case-preserving global replacement across 33 files.
  - Renamed the local SQLite database file from `storyvault.db` to `memwault.db`.
  - Updated environment variables prefix to `MEMWAULT_`.

---

### Phase 5: Licensing & Rights Reservation
* **Licensing Model:** Added a Source-Available copyright license (**PolyForm Noncommercial License 1.0.0**) to protect developer intellectual property.
* **Terms:** Grants public permission for personal usage, hobbies, study, and research, but strictly forbids commercial redistribution, hosting, or sales of the software without explicit permission.

---

## 📜 Dev Commit & Checkpoint Log

| Checkpoint | Target / Changes | Key Model Used | Description / Details |
| :--- | :--- | :--- | :--- |
| **CP 1** | Architecture Design | GPT-4o / Claude | Brainstormed MOM architecture, whitepaper verification, and database choices. |
| **CP 2** | DB & Scraper Setup | Claude 3.5 Sonnet | Implemented models, instagrapi integration, local/S3 storage clients. |
| **CP 3** | Frontend Foundation | Claude 3.5 Sonnet | Created React structure, glassmorphism CSS, routing, and Timeline views. |
| **CP 4** | Background Workers | GPT-4o / Claude | Added Celery + Redis background tasks and scheduling logs. |
| **CP 5** | Instagram Session Bypass | Claude Opus 4.6 | Patched `instagram.py` scraper to support direct Web API fetching via Session ID cookies. |
| **CP 6** | Login Bug Fixes & Refactor | Gemini 3.5 Flash / GPT-OSS 120B | Fixed lazy client initialization. Created master README.md. Performed project-wide renaming to **MemWault**. Added PolyForm Noncommercial License. |

