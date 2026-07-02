"""
MemWault Database Connection & Session Management
Uses SQLAlchemy 2.0 async engine with asyncpg driver.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# ── Async Engine ─────────────────────────────────────────
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

# ── Session Factory ──────────────────────────────────────
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Base Model ───────────────────────────────────────────
class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


# ── Dependency ───────────────────────────────────────────
async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Lifecycle ────────────────────────────────────────────
async def init_db():
    """Create all tables. Call once on startup."""
    async with engine.begin() as conn:
        from app import models  # noqa: F401 – import to register models
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Dispose engine on shutdown."""
    await engine.dispose()
