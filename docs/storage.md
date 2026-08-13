# MemWault — Storage & Media Architecture

MemWault supports flexible, self-controlled media storage models to guarantee independence from proprietary cloud silos.

---

## 💾 Storage Options

### 1. Local / Self-Hosted Storage (Default)
- **Database:** SQLite (local development) or PostgreSQL (self-hosted).
- **Filesystem:** Media assets stored directly on the local host drive (`media/<user_id>/<year>/<month>/<story_id>.jpg`).
- **Sidecar Journals:** Human-readable `.md` markdown files saved directly alongside media files.

### 2. Self-Controlled Object Storage
- **MinIO:** Self-hosted S3-compatible object storage container.
- **S3 Bucket:** Private AWS S3 bucket configured with pre-signed URLs.

---

## 📁 Directory Structure
```text
media/
└── <user_id>/
    └── 2026/
        └── 07/
            ├── story_1786600791480.jpg      # Archived Story Image
            ├── story_1786600791480.md       # Sidecar Markdown Journal Note
            ├── story_1786600823412.mp4      # Archived Story Video
            └── story_1786600823412.json     # Full Raw EXIF / Scraper Manifest
```
