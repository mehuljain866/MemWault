"""
MemWault Backend Configuration
Loads environment variables and provides typed settings objects.
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──────────────────────────────────────────────
    app_name: str = "MemWault"
    app_version: str = "0.1.0"
    debug: bool = False
    secret_key: str = "change-me-to-a-random-secret-key-in-production"

    # ── Database ─────────────────────────────────────────
    database_type: str = "sqlite"  # "sqlite" or "postgres"
    postgres_user: str = "memwault"
    postgres_password: str = "memwault_dev_password"
    postgres_db: str = "memwault"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        if self.database_type == "sqlite":
            return "sqlite+aiosqlite:///memwault.db"
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        if self.database_type == "sqlite":
            return "sqlite:///memwault.db"
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Redis & Background tasks ─────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_always_eager: bool = True  # Run tasks synchronously locally if True (no Redis required)

    # ── S3 / MinIO / Local Storage ───────────────────────
    storage_type: str = "local"  # "local" or "s3"
    storage_local_dir: str = "data/media"
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "memwault-media"
    s3_region: str = "us-east-1"

    # ── Instagram ────────────────────────────────────────
    instagram_username: str = ""
    instagram_password: str = ""

    # ── Spotify (optional) ───────────────────────────────
    spotify_client_id: str = ""
    spotify_client_secret: str = ""

    # ── Polling ──────────────────────────────────────────
    story_poll_interval_minutes: int = 15

    # ── JWT Auth ─────────────────────────────────────────
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440  # 24 hours

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Allow environment variable prefix: MEMWAULT_
        env_prefix = "MEMWAULT_"


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton settings instance."""
    return Settings()
