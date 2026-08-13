# MemWault — REST API Endpoint Reference

FastAPI backend RESTful API endpoint map providing interface contracts for authentication, memory objects, spatial map clusters, highlight albums, trash archives, and local system integration.

Interactive OpenAPI documentation is available when running the server at **`http://localhost:8000/docs`**.

---

## 🔑 1. Authentication (`/api/auth`)

| Method | Endpoint | Auth Required | Request Body | Response Payload | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | ❌ No | `{username, password}` | `{id, username, created_at}` | Register a new local MemWault user |
| `POST` | `/api/auth/login` | ❌ No | `{username, password}` | `{access_token, token_type}` | Authenticate user & receive JWT token |
| `GET` | `/api/auth/me` | ✅ Yes | *None* | `{id, username, created_at}` | Retrieve current user profile |

---

## 📖 2. Stories & Timeline (`/api/stories`)

| Method | Endpoint | Auth Required | Request Body | Response Payload | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/api/stories` | ✅ Yes | *QueryParams (year, month, type)* | `[{id, media_url, taken_at, ...}]` | Query archived memory timeline |
| `GET` | `/api/stories/{id}` | ✅ Yes | *None* | `{id, media_url, caption, music, ...}` | Fetch single memory object details |
| `PATCH` | `/api/stories/{id}` | ✅ Yes | `{caption_text, is_reel_repost}` | `{id, caption_text, ...}` | Update story caption or classification |
| `DELETE` | `/api/stories/{id}` | ✅ Yes | *None* | `{status: "archived"}` | Soft-delete story to Archives trash |
| `POST` | `/api/stories/{id}/restore` | ✅ Yes | *None* | `{status: "restored"}` | Restore soft-deleted story to timeline |
| `GET` | `/api/stories/{id}/viewers` | ✅ Yes | *None* | `[{viewer_username, viewed_at}]` | *Legacy:* Query historical viewer list |

---

## 🗺️ 3. Spatial Map (`/api/stories/locations`)

| Method | Endpoint | Auth Required | Request Body | Response Payload | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/api/stories/locations/all` | ✅ Yes | *None* | `[{id, latitude, longitude, name}]` | Fetch spatial coordinates for Leaflet map |
| `PATCH` | `/api/stories/{id}/location` | ✅ Yes | `{location_name, lat, lng}` | `{id, location_name, ...}` | Edit or manually assign story location |

---

## 🎨 4. Highlights & Albums (`/api/highlights`)

| Method | Endpoint | Auth Required | Request Body | Response Payload | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/api/highlights` | ✅ Yes | *None* | `[{id, title, cover_url, items_count}]` | List user custom highlight albums |
| `POST` | `/api/highlights` | ✅ Yes | `{title, story_ids, cover_url}` | `{id, title, cover_url, ...}` | Create a new highlight album |
| `GET` | `/api/highlights/{id}` | ✅ Yes | *None* | `{id, title, stories: [...]}` | Retrieve highlight details & story items |
| `PUT` | `/api/highlights/{id}` | ✅ Yes | `{title, cover_url, cover_type}` | `{id, title, cover_url}` | Update highlight title or cover |
| `DELETE` | `/api/highlights/{id}` | ✅ Yes | *None* | `{status: "deleted"}` | Delete highlight album |

---

## 🗑️ 5. Archives & Trash (`/api/archives`)

| Method | Endpoint | Auth Required | Request Body | Response Payload | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/api/archives` | ✅ Yes | *QueryParams (page, limit)* | `[{id, media_url, deleted_at}]` | List soft-deleted trash items |
| `POST` | `/api/archives/purge` | ✅ Yes | `{story_ids: [...]}` | `{purged_count: 5}` | Permanently delete selected trash items |
| `POST` | `/api/archives/restore-all` | ✅ Yes | *None* | `{restored_count: 12}` | Restore all soft-deleted items to timeline |

---

## 📁 6. Storage & Local Desktop Integration (`/api/storage`)

| Method | Endpoint | Auth Required | Request Body | Response Payload | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/api/storage/open-folder` | ✅ Yes | `{path: "media/178660"}` | `{status: "opened"}` | *Native Host:* Open file in Explorer |
| `GET` | `/api/stories/locate` | ✅ Yes | *QueryParam (path)* | `{status: "highlighted"}` | *Native Host:* Highlight file in Explorer |

---

## ⚙️ 7. Settings & Scraper Pipeline (`/api/scraper`)

| Method | Endpoint | Auth Required | Request Body | Response Payload | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/api/scraper/login-browser` | ✅ Yes | *None* | `{status: "browser_launched"}` | Launch Playwright Chrome for IG login |
| `DELETE` | `/api/scraper/session` | ✅ Yes | *None* | `{status: "session_cleared"}` | Disconnect saved Instagram session |
| `GET` | `/api/scraper/logs` | ✅ Yes | *None* | `[{task_id, status, items_scraped}]` | Fetch background ingestion task logs |
