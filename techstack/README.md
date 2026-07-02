# MemWault — Tech Stack

This folder contains the full-stack codebase (backend API server and frontend React client) for the MemWault memory preservation platform.

---

### 📖 Master Documentation

To avoid duplication, all setup guides, technical details, API documentation links, and project information have been combined into the main repository README:

👉 **[View the Master README.md](../README.md)**

---

### Folder Contents

* **[`backend/`](backend/)**: FastAPI (Python) backend application containing the REST endpoints, Instagram scraping engine, database schemas, and background tasks.
* **[`frontend/`](frontend/)**: React + Vite Progressive Web App (PWA) client interface styled with glassmorphic dark-mode CSS.
* **[`docker-compose.yml`](docker-compose.yml)**: Multi-container configuration for launching Postgres database, Redis messaging queue, and MinIO object storage services.
