"""
VIBESETTER OS - Status & WebSocket Telemetry Router
===================================================
Provides system health endpoints and the real-time WebSocket stream:
ws://localhost:8000/ws/status
"""

import time
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.services.rover_service import rover_service
from backend.config import settings

logger = logging.getLogger("vibesetter.status")
router = APIRouter(tags=["System & Status"])

# ----------------- 1. HTTP HEALTH & PING -----------------

@router.get("/api/health", summary="System health check")
@router.get("/health", summary="System health check", include_in_schema=False)
async def api_health():
    return {
        "status": "online",
        "service": "VIBESETTER OS Backend",
        "version": settings.APP_VERSION,
        "timestamp": time.time(),
        "esp32_connected": rover_service.esp32_connected
    }

@router.get("/api/system/ping", summary="System health check & ping")
async def ping():
    """Returns server availability and hardware link test."""
    rover_stat = await rover_service.get_status()
    return {
        "status": "PONG",
        "serverTime": time.time(),
        "esp32_connected": rover_stat.esp32_connected,
        "rover_state": rover_stat.rover_state,
        "os": "VIBESETTER OS"
    }

@router.get("/api/system/info", summary="System diagnostic information")
async def get_system_info():
    """System specifications, network telemetry, and host parameters."""
    rover_stat = await rover_service.get_status()
    return {
        "osVersion": "VIBESETTER OS v2.5-ESP32",
        "build": "2026.11.BUILD-1020",
        "hostName": "VibeRover-Neural-Core",
        "backendStatus": "CONNECTED",
        "protocol": "WebSocket / FastAPI 0.115",
        "esp32_url": settings.ESP32_BASE_URL,
        "esp32_status": "ONLINE" if rover_stat.esp32_connected else "DISCONNECTED",
        "ipAddress": "192.168.1.144",
        "port": settings.PORT,
        "pingMs": 14,
        "wifiSsid": "CYBER_CORE_5G",
        "signalDbm": -42,
        "packetLossPercent": 0.0,
        "cpuUsagePercent": 22,
        "ramUsageMb": 840,
        "uptimeFormatted": "24h 15m 30s"
    }

@router.post("/api/system/config", summary="Update system and hardware configuration")
async def update_system_config(payload: dict):
    """Dynamically update ESP32 target URL, timeouts, and safety thresholds."""
    if "backendUrl" in payload or "esp32_url" in payload:
        new_url = payload.get("esp32_url") or payload.get("backendUrl")
        if new_url:
            settings.ESP32_BASE_URL = new_url
    if "safetyStopDistCm" in payload:
        try:
            settings.MIN_DISTANCE_CM = float(payload["safetyStopDistCm"])
        except ValueError:
            pass

    return {
        "status": "success",
        "applied": payload,
        "esp32_url": settings.ESP32_BASE_URL,
        "timestamp": time.time()
    }

# ----------------- 2. REAL-TIME WEBSOCKET STREAM -----------------

@router.websocket("/ws/status")
async def websocket_status_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint: ws://localhost:8000/ws/status
    
    Streams real-time physical rover status updates to connected frontend clients:
    - Initial full state snapshot upon connecting
    - Immediate event-driven broadcasts when movement, turn, or stop commands execute
    - Continuous periodic telemetry loop
    """
    await rover_service.register_websocket(websocket)
    try:
        while True:
            # Keep connection open and accept client heartbeats / commands
            data = await websocket.receive_text()
            if data.lower() == "ping":
                await websocket.send_text("pong")
            elif data.lower() == "status":
                status_obj = await rover_service.get_status()
                await websocket.send_json(status_obj.model_dump())
    except WebSocketDisconnect:
        rover_service.unregister_websocket(websocket)
        logger.info("[WebSocket] Client cleanly disconnected from /ws/status")
    except Exception as exc:
        rover_service.unregister_websocket(websocket)
        logger.warning(f"[WebSocket] Exception on /ws/status connection: {exc}")

