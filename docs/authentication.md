# MemWault — Authentication & Security Architecture

MemWault utilizes separated authentication domains to isolate local dashboard user access from Instagram session credentials.

---

## 🔑 1. App-Level Authentication (Dashboard)

Access to the MemWault dashboard is secured to ensure that only authorized local users can view archived stories and journals.

```text
User ──(Username & Password)──► FastAPI /api/auth/login ──► Verify bcrypt hash
                                                                 │
                                                                 ▼
User ◄──(Bearer JWT Token)─────── Return JWT ◄──── Sign JWT Payload
```

- **JWT Tokens:** Signed JSON Web Tokens containing `user_id` and `username`, persisted client-side in `localStorage` for the PWA.
- **Password Hashing:** Plaintext passwords are salt-hashed using `bcrypt` before storage.
- **ORM Isolation:** Multi-tenant query scoping guarantees data separation by `user_id`.

---

## 📱 2. Instagram Session Ingestion

MemWault interacts with Instagram using a hybrid local session approach:

```text
Local Machine
┌────────────────────────────────────────────────────────┐
│ 1. Local Browser Login (Playwright / Chrome)           │
│    Establishes real user session locally               │
└───────────────────────────┬────────────────────────────┘
                            │ Extracted Cookies (sessionid, csrftoken)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Local Database Persistence                          │
│    Stores session parameters scoped to user_id         │
└───────────────────────────┬────────────────────────────┘
                            │ Injected into Scraper
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Celery Scraper Engine (instagrapi)                  │
│    Fetches active stories & archived engagement          │
└────────────────────────────────────────────────────────┘
```

### Account Safety & Endpoint Strategy
- **Endpoint Scoping:** MemWault avoids automated scraping of individual story viewer lists, which triggers Instagram anti-bot telemetry.
- **Archived Engagement Metrics:** Focuses exclusively on safe metrics (`viewer_count` and `like_count`).
- **Legacy Compatibility:** Legacy `StoryViewer` schemas and `/stories/{id}/viewers` endpoints remain for reading older historical archives but are no longer populated by the active scraper.
- **Human Delay & Rate Limits:** Requests are spaced with randomized jitter to emulate legitimate mobile client traffic.
- **100% Local Processing:** Credentials and session tokens live strictly on your host hardware and are never transmitted to external services.
