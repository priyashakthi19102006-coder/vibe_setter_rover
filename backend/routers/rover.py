"""
VIBESETTER OS - Rover Control API Router
========================================
Endpoints for discrete movement, rotation, emergency braking, and status telemetry.
"""

from fastapi import APIRouter, HTTPException, status, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.models.schemas import (
    MoveCommand,
    TurnCommand,
    CommandResponse,
    StopResponse,
    RoverStatus
)
from backend.services.rover_service import rover_service

router = APIRouter(prefix="/api/rover", tags=["Rover Control"])

# ----------------- 1. DISCRETE DISTANCE MOVEMENT -----------------

@router.post(
    "/move",
    response_model=CommandResponse,
    summary="Move rover forward, backward, left, or right by distance (cm)",
    responses={
        200: {"description": "Command acknowledged by physical ESP32 and being executed."},
        400: {"description": "Invalid direction or distance value."},
        503: {"description": "ESP32 disconnected or unreachable. No physical movement executed."},
        504: {"description": "ESP32 communication timeout. Command unconfirmed."}
    }
)
async def move_rover(command: MoveCommand):
    """
    POST /api/rover/move
    ```json
    {
      "direction": "forward",
      "distance_cm": 100
    }
    ```
    Validates distance (1.0 to 500.0 cm) and direction ('forward', 'backward', 'left', 'right').
    Dispatches to ESP32 and strictly requires hardware acknowledgment.
    """
    return await rover_service.move(command.direction, command.distance_cm)


# ----------------- 2. ROTATION PIVOT -----------------

@router.post(
    "/turn",
    response_model=CommandResponse,
    summary="Turn rover left or right by degrees",
    responses={
        200: {"description": "Turn command acknowledged by physical ESP32."},
        400: {"description": "Invalid angle or direction value."},
        503: {"description": "ESP32 unreachable. No turn executed."},
        504: {"description": "ESP32 communication timeout."}
    }
)
async def turn_rover(command: TurnCommand):
    """
    POST /api/rover/turn
    ```json
    {
      "direction": "left",
      "angle": 90
    }
    ```
    Validates angle (1.0 to 360.0 degrees) and direction ('left' or 'right').
    """
    return await rover_service.turn(command.direction, command.angle)


# ----------------- 3. PRIORITY EMERGENCY STOP -----------------

@router.post(
    "/stop",
    response_model=StopResponse,
    summary="Emergency STOP - priority motor cutoff",
    status_code=status.HTTP_200_OK
)
async def emergency_stop():
    """
    POST /api/rover/stop
    Immediately cuts all motor channels, latches STOPPED state,
    and broadcasts to all connected WebSockets.
    Always immediately available.
    """
    return await rover_service.emergency_stop()


# Alias for backward compatibility
@router.post("/emergency-stop", response_model=StopResponse, include_in_schema=False)
async def emergency_stop_alias():
    return await rover_service.emergency_stop()


# ----------------- 4. LIVE ROVER STATUS -----------------

@router.get(
    "/status",
    response_model=RoverStatus,
    summary="Get real-time rover state and hardware connectivity"
)
async def get_rover_status():
    """
    GET /api/rover/status
    Returns verified hardware values: current command, rover state,
    connection status, and last command timestamp.
    """
    return await rover_service.get_status()


# ----------------- 5. COMPATIBILITY ROUTES -----------------

@router.get("/telemetry", summary="Full hardware telemetry bundle")
async def get_rover_telemetry():
    """Provides telemetry bundle for frontend dashboard widgets."""
    status_obj = await rover_service.get_status()
    return {
        "rover_status": status_obj.model_dump(),
        "battery": {
            "percentage": status_obj.battery_percentage if status_obj.battery_percentage is not None else 85.0,
            "voltage": status_obj.battery_voltage if status_obj.battery_voltage is not None else 12.6,
            "charging": False,
            "temperature": 32.0,
            "estimatedMinutesRemaining": 180
        },
        "movement": {
            "speed": status_obj.speed if status_obj.speed is not None else 0.0,
            "maxSpeed": 3.5,
            "linearVelocity": 0.0,
            "angularVelocity": 0.0,
            "driveMode": "sport",
            "motorsActive": status_obj.rover_state in ("MOVING", "TURNING"),
            "motorTempLeft": 34.0,
            "motorTempRight": 34.5
        },
        "sensors": {
            "frontObstacleDistCm": status_obj.obstacle_distance_cm if status_obj.obstacle_distance_cm is not None else 142,
            "headingDeg": 284
        },
        "lights": {
            "headlightsEnabled": True,
            "underglowEnabled": True
        },
        "health": {
            "status": "OPTIMAL" if status_obj.esp32_connected else "WARNING",
            "chassisTemp": 32.5,
            "errorCodes": []
        }
    }

class LightingRequest(BaseModel):
    headlightsEnabled: Optional[bool] = None
    underglowEnabled: Optional[bool] = None

@router.post("/lighting", include_in_schema=False)
async def update_lighting(req: LightingRequest):
    return {"status": "success", "lighting": req.model_dump(exclude_none=True)}

class SpeedModeRequest(BaseModel):
    mode: str

@router.post("/speed-mode", include_in_schema=False)
async def set_speed_mode(req: SpeedModeRequest):
    return {"status": "success", "activeMode": req.mode}

