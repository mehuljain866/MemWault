# MemWault — Configuration Reference

MemWault is configured using environment variables.

---

## ⚙️ Environment Variables

### Core Server Settings
```env
APP_NAME=MemWault
DEBUG=False
SECRET_KEY=your_super_secret_jwt_key_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Database Settings
```env
# SQLite (Default local setup)
DATABASE_URL=sqlite+aiosqlite:///./memwault.db

# PostgreSQL (Production setup)
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/memwault
```

### Media Storage Settings
```env
STORAGE_TYPE=local  # Options: 'local', 's3'
STORAGE_LOCAL_DIR=./media

# S3 Configuration (Optional)
# S3_BUCKET_NAME=my-memwault-bucket
# S3_ENDPOINT_URL=https://s3.amazonaws.com
# S3_ACCESS_KEY_ID=your_access_key
# S3_SECRET_ACCESS_KEY=your_secret_key
```

### Celery & Redis Settings
```env
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```
