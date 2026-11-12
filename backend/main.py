"""
VIBESETTER OS - Backend Server Application Entrypoint
=====================================================
FastAPI application with CORS, WebSocket support, and ESP32 physical rover bridge.
"""

import sys
import time
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager

# Bootstrap sys.path so the server can run from project root or backend directory
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from backend.config import settings
from backend.services.esp32_service import esp32_service
from backend.services.rover_service import rover_service
from backend.routers.rover import router as rover_router
from backend.routers.status import router as status_router
from backend.routers.voice import router as voice_router
from backend.routers.ai import router as ai_router
from backend.routers.mood import router as mood_router
from backend.routers.expressions import router as expressions_router
from backend.routers.music import router as music_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("vibesetter.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan coordinator:
    - Starts HTTP connection pool for ESP32
    - Launches background telemetry & WebSocket broadcast loop
    - Performs graceful connection pool cleanup on shutdown
    """
    logger.info("====================================================")
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📡 ESP32 Target URL: {settings.ESP32_BASE_URL}")
    logger.info(f"⏱️ ESP32 Timeout: {settings.ESP32_TIMEOUT_SECONDS}s")
    logger.info(f"🌐 WebSocket Endpoint: ws://localhost:{settings.PORT}/ws/status")
    logger.info("====================================================")

    # 1. Initialize persistent HTTP connection pool for ESP32
    await esp32_service.initialize()

    # 2. Launch background WebSocket broadcast task
    telemetry_task = asyncio.create_task(rover_service.start_telemetry_loop())

    yield

    # 3. Shutdown cleanup
    logger.info("[Lifespan] Shutting down background tasks...")
    telemetry_task.cancel()
    try:
        await telemetry_task
    except asyncio.CancelledError:
        pass

    await esp32_service.close()
    logger.info("[Lifespan] Cleanup complete. VIBESETTER OS stopped.")


# Initialize FastAPI Application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Cyberpunk AI Companion Rover Control API & Physical ESP32 Bridge",
    lifespan=lifespan
)

# Configure CORS Middleware for the React/Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Core Routers
app.include_router(rover_router)
app.include_router(status_router)
app.include_router(voice_router)
app.include_router(ai_router)
app.include_router(mood_router)
app.include_router(expressions_router)
app.include_router(music_router)


# Root Health & Info Endpoints
@app.get("/", tags=["System & Status"])
async def root():
    return {
        "status": "online",
        "service": "VIBESETTER OS Backend",
        "system": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "esp32_endpoint": settings.ESP32_BASE_URL,
        "api_docs": "/docs",
        "websocket": "/ws/status"
    }

@app.get("/health", tags=["System & Status"])
@app.get("/api/health", tags=["System & Status"])
async def health_check():
    return {
        "status": "online",
        "service": "VIBESETTER OS Backend",
        "version": settings.APP_VERSION,
        "timestamp": time.time(),
        "esp32_connected": rover_service.esp32_connected
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

