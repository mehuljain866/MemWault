# MemWault — Instagram Ingestion Architecture

MemWault handles Instagram authentication, session management, story polling, and rate limiting using a hybrid browser and mobile API architecture.

---

## 🔄 Ingestion Pipeline

```text
Local Host Machine
┌────────────────────────────────────────────────────────┐
│ 1. Local Browser Login (Playwright / Chrome)           │
│    Establishes real user session locally               │
└───────────────────────────┬────────────────────────────┘
                            │ Session Cookies (sessionid, csrftoken)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Local Database Persistence                          │
│    Stores session parameters scoped to user_id         │
└───────────────────────────┬────────────────────────────┘
                            │ Injected into Scraper
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Celery Scraper Engine (instagrapi)                  │
│    Polls active stories & archived engagement          │
└───────────────────────────┬────────────────────────────┘
                            │ Raw Media & Context
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Media Storage & Sidecar Generation                  │
│    Saves media to disk/S3 and generates .md sidecars   │
└────────────────────────────────────────────────────────┘
```

---

## 🛡️ Risk Reduction & Account Safety Strategy

- **Endpoint Scoping:** MemWault avoids automated scraping of individual story viewer lists, which triggers Instagram's anti-bot telemetry.
- **Archived Engagement Metrics:** Focuses exclusively on safe metrics (`viewer_count` and `like_count`).
- **Human Delay & Jitter:** Polling tasks execute with randomized delays to emulate normal mobile application activity.
- **Legacy Compatibility:** The `StoryViewer` database schema and API endpoints are retained solely for reading historical data from older archives.
