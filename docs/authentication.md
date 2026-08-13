# MemWault — Authentication & Security Architecture

MemWault utilizes a dual-layer security architecture to separate local dashboard user access from Instagram session credentials.

---

## 🔑 1. App-Level Authentication (Dashboard)

Access to the MemWault dashboard is secured to ensure that only authorized local users can view archived stories and journals.

```text
User ──(Username & Password)──► FastAPI /login ──► Verify bcrypt hash
                                                        │
                                                        ▼
User ◄──(Bearer JWT Token)────── Return JWT ◄──── Sign JWT Payload
```

- **JWT Tokens:** Signed JSON Web Tokens containing `user_id` and `username`.
- **Password Hashing:** Plaintext passwords are salt-hashed using `bcrypt` before storage.
- **ORM Isolation:** Multi-tenant query scoping guarantees data separation by `user_id`.

---

## 📱 2. Instagram Ingestion & Session Management

MemWault interacts with Instagram using a hybrid local session approach:

```text
Local Machine
┌────────────────────────────────────────────────────────┐
│ 1. Browser Login / Playwright Chromium                 │
│    Establishes real user session locally               │
└───────────────────────────┬────────────────────────────┘
                            │ Extracted Cookies (sessionid, csrftoken)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Local Database (Encrypted InstagramSession)         │
│    Stores encrypted cookies & device parameters        │
└───────────────────────────┬────────────────────────────┘
                            │ Injected into Scraper
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Celery Scraper Engine (instagrapi)                  │
│    Fetches active stories & perpetual metrics           │
└────────────────────────────────────────────────────────┘
```

### Risk Reduction & Account Safety Strategy
- **Deliberate Endpoint Scoping:** MemWault avoids automated individual viewer-list endpoints, which trigger anti-bot flags.
- **Perpetual Engagement Metrics:** Focuses exclusively on safe metrics (Viewer Counts and Like Counts).
- **Human Delay & Rate Limits:** Requests are spaced with randomized jitter to emulate legitimate mobile client traffic.
- **100% Local Credentials:** Session tokens live strictly on your host hardware and are never transmitted to external services.
