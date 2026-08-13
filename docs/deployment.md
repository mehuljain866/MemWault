# MemWault — Deployment & Infrastructure Guide

MemWault supports both local native development and full containerized Docker Compose deployments.

---

## 🐳 Containerized Deployment (Docker Compose)

The containerized stack launches PostgreSQL, Redis, MinIO, FastAPI, Celery Workers, Celery Beat, and the React PWA frontend in isolated containers:

```bash
cd techstack
docker compose up -d --build
```

### Container Services Overview:
- `postgres`: PostgreSQL 15 database instance.
- `redis`: Redis broker for Celery task management.
- `minio`: S3-compatible object storage server.
- `backend`: FastAPI Uvicorn REST server.
- `celery_worker`: Background ingestion worker process.
- `celery_beat`: Scheduled task trigger daemon.
- `frontend`: Nginx container serving compiled React 19 PWA build.

> **Note on Desktop Features:** Containerized deployments cannot launch desktop applications (such as Windows Explorer or interactive Playwright browsers) on the host machine. For desktop GUI integration, run the backend natively on the host OS.
