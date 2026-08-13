# MemWault — Configuration Reference

MemWault is configured using environment variables with the `MEMWAULT_` prefix.

---

## ⚙️ Environment Variables Reference

| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `MEMWAULT_DATABASE_TYPE` | `sqlite` | Database engine (`sqlite` or `postgres`) |
| `MEMWAULT_POSTGRES_HOST` | `localhost` | PostgreSQL server host |
| `MEMWAULT_POSTGRES_PORT` | `5432` | PostgreSQL server port |
| `MEMWAULT_POSTGRES_USER` | `memwault` | PostgreSQL database user |
| `MEMWAULT_POSTGRES_PASSWORD` | — | PostgreSQL database password |
| `MEMWAULT_POSTGRES_DB` | `memwault` | PostgreSQL database name |
| `MEMWAULT_REDIS_URL` | `redis://localhost:6379/0` | Redis broker URI for Celery tasks |
| `MEMWAULT_STORAGE_TYPE` | `local` | Storage mode (`local` or `s3`) |
| `MEMWAULT_STORAGE_LOCAL_DIR` | `./data/media` | Local filesystem media directory |
| `MEMWAULT_SECRET_KEY` | *[Change in Prod]* | Secret key for JWT signing |

> **Security Note:** Replace the default development `MEMWAULT_SECRET_KEY` with a strong random secret before deploying outside local development environments.
