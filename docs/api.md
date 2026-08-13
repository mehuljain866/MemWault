# MemWault — REST API Endpoint Reference

FastAPI backend endpoints providing RESTful access to authentication, stories, maps, highlights, and settings.

---

## 🔑 Authentication (`/api/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new local MemWault user |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token |
| `GET` | `/api/auth/me` | Fetch current authenticated user |

---

## 📖 Stories & Timeline (`/api/stories`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/stories` | Query archived stories with pagination & filters |
| `GET` | `/api/stories/{id}` | Retrieve single story details & metadata |
| `PATCH` | `/api/stories/{id}` | Update story caption or metadata |
| `DELETE` | `/api/stories/{id}` | Soft-delete story to Archives trash |
| `POST` | `/api/stories/{id}/restore` | Restore soft-deleted story |
| `GET` | `/api/stories/locations/all` | Fetch spatial coordinates for map clustering |
| `GET` | `/api/stories/{id}/viewers` | Legacy endpoint for historical viewer archives |

---

## 🎨 Highlights & Albums (`/api/highlights`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/highlights` | List user highlight albums |
| `POST` | `/api/highlights` | Create a new highlight album |
| `GET` | `/api/highlights/{id}` | Retrieve highlight details & story list |
| `PUT` | `/api/highlights/{id}` | Update highlight title or cover |
| `DELETE` | `/api/highlights/{id}` | Delete highlight album |

---

## ⚙️ Settings & System (`/api/settings`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/scraper/login-browser` | Launch local Playwright browser for Instagram login |
| `GET` | `/api/scraper/logs` | Fetch background scrape execution logs |
| `POST` | `/api/storage/open-folder` | Desktop bridge to open local media folder in Explorer |
