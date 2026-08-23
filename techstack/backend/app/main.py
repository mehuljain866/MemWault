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

# ── CORS (allow PWA frontend & local Wi-Fi mobile devices) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pathlib import Path

# ── Media directory ──────────────────────────────────────
# Media is served by the router's GET /media/{path} handler, which honours
# MEMWAULT_STORAGE_LOCAL_DIR and refuses paths outside it.
#
# A StaticFiles mount used to sit at /api/v1/media. Starlette matches routes in
# registration order and a Mount matches on prefix, so it also swallowed
# PUT /api/v1/media/{story_id}/location - that endpoint returned 405 and editing
# a story's location silently did nothing. The mount is redundant with the
# router handler (and ignored the configured storage dir), so it is gone.
if settings.storage_type == "local":
    Path(settings.storage_local_dir).mkdir(parents=True, exist_ok=True)

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


# ── Frontend Dist & Static File Serving (SPA + Direct Asset Mounting) ──
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse
from fastapi import HTTPException

DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/manifest.webmanifest")
    async def manifest():
        return FileResponse(str(DIST_DIR / "manifest.webmanifest"))

    @app.get("/sw.js")
    async def sw():
        return FileResponse(str(DIST_DIR / "sw.js"))

    @app.get("/")
    async def index_root():
        return FileResponse(str(DIST_DIR / "index.html"))

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = DIST_DIR / full_path
        if target_file.is_file():
            return FileResponse(str(target_file))
        return FileResponse(str(DIST_DIR / "index.html"))

