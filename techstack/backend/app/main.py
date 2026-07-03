"""
MemWault Backend — FastAPI Application Entry Point
"""

import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import get_settings
from app.database import close_db, init_db

settings = get_settings()

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("memwault")


# ── Lifespan ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("╔══════════════════════════════════════════╗")
    logger.info("║     MemWault Engine v%s Starting     ║", settings.app_version)
    logger.info("╚══════════════════════════════════════════╝")

    # Initialize database tables
    await init_db()
    logger.info("Database initialized")

    yield

    # Cleanup
    await close_db()
    logger.info("MemWault Engine shut down")


# ── FastAPI App ──────────────────────────────────────────
app = FastAPI(
    title="MemWault API",
    description="Memory Object Model (MOM) — A portable, user-owned digital memory archive.",
    version=settings.app_version,
    lifespan=lifespan,
)

# ── CORS (allow PWA frontend) ───────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",    # Alt dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────
app.include_router(router, prefix="/api/v1")


# ── Health Check ─────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
    }
