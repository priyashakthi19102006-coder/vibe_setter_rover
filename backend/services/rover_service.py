"""
VIBESETTER OS - Rover Hardware Business Logic & State Coordinator
================================================================
Manages active physical rover state, coordinates commands with ESP32Service,
and broadcasts live telemetry to all connected WebSocket clients.

SAFETY PRINCIPLES:
- Priority handling for Emergency Stop.
- State is updated to MOVING or TURNING ONLY AFTER ESP32 acknowledges the command.
- Never pretends physical motion occurred if ESP32 fails.
"""

import asyncio
import time
import logging
from typing import Set, Optional
from fastapi import WebSocket, HTTPException, status

from backend.config import settings
from backend.models.schemas import (
    MoveDirection,
    TurnDirection,
    RoverState,
    CommandResponse,
    StopResponse,
    RoverStatus
)
from backend.services.esp32_service import (
    esp32_service,
    ESP32Error,
    ESP32ConnectionError,
    ESP32TimeoutError,
    ESP32CommandRejectedError
)

logger = logging.getLogger("vibesetter.rover")

class RoverService:
    def __init__(self):
        # Initial state is DISCONNECTED until verified
        self.state: RoverState = RoverState.IDLE
        self.current_command: str = "IDLE"
        self.last_command: str = "SYSTEM INITIALIZED"
        self.last_command_timestamp: str = time.strftime("%Y-%m-%d %H:%M:%S")
        self.confirmation_message: str = "Backend ready. Awaiting connection to ESP32."
        self.emergency_stopped: bool = False
        
        # Physical ESP32 link status & telemetry cache
        self.esp32_connected: bool = False
        self.esp32_last_seen: Optional[str] = None
        self.battery_voltage: Optional[float] = None
        self.battery_percentage: Optional[float] = None
        self.obstacle_distance_cm: Optional[float] = None
        self.speed: Optional[float] = None

        # WebSocket active connection pool
        self.active_websockets: Set[WebSocket] = set()
        self._telemetry_task: Optional[asyncio.Task] = None

    # ----------------- WEBSOCKET MANAGEMENT -----------------

    async def register_websocket(self, websocket: WebSocket):
        """Registers a new frontend WebSocket client and sends current state."""
        await websocket.accept()
        self.active_websockets.add(websocket)
        logger.info(f"[WebSocket] Client connected. Total active: {len(self.active_websockets)}")
        
        # Send initial snapshot immediately
        current_status = await self.get_status()
        await websocket.send_json(current_status.model_dump())

    def unregister_websocket(self, websocket: WebSocket):
        """Removes a disconnected frontend WebSocket client."""
        self.active_websockets.discard(websocket)
        logger.info(f"[WebSocket] Client disconnected. Total active: {len(self.active_websockets)}")

    async def broadcast_status(self):
        """Broadcasts current real status to all connected frontend clients."""
        if not self.active_websockets:
            return

        status_data = (await self.get_status()).model_dump()
        dead_connections = set()

        for ws in self.active_websockets:
            try:
                await ws.send_json(status_data)
            except Exception as e:
                logger.warning(f"[WebSocket] Failed to send update to client ({e}). Flagging for removal.")
                dead_connections.add(ws)

        for dead_ws in dead_connections:
            self.active_websockets.discard(dead_ws)

    # ----------------- COMMAND EXECUTION -----------------

    async def move(self, direction: MoveDirection, distance_cm: float) -> CommandResponse:
        """
        Executes discrete distance movement:
        1. Dispatches to physical ESP32
        2. Strictly waits for ESP32 HTTP 200 acknowledgment
        3. Updates state and broadcasts to WebSockets
        """
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cmd_str = f"MOVE {direction.value.upper()} ({distance_cm} cm)"

        try:
            # Send to physical ESP32 (raises exception if offline / timed out)
            esp32_ack = await esp32_service.send_move(direction.value, distance_cm)

            # State updated ONLY after ESP32 acknowledges
            self.state = RoverState.MOVING
            self.current_command = cmd_str
            self.last_command = cmd_str
            self.last_command_timestamp = timestamp_str
            self.confirmation_message = f"Hardware confirmed: Executing MOVE {direction.value.upper()} for {distance_cm} cm."
            self.emergency_stopped = False
            self.esp32_connected = True
            self.esp32_last_seen = timestamp_str

            # Broadcast update immediately
            await self.broadcast_status()

            return CommandResponse(
                status="success",
                rover_state=self.state.value,
                current_command=cmd_str,
                last_command=cmd_str,
                last_command_timestamp=timestamp_str,
                confirmation=self.confirmation_message,
                esp32_acknowledged=True,
                direction=direction.value,
                distance_cm=distance_cm,
                timestamp=time.time()
            )

        except ESP32TimeoutError as exc:
            self.state = RoverState.ERROR
            self.esp32_connected = False
            self.confirmation_message = f"Hardware Timeout: {str(exc)}"
            await self.broadcast_status()
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Rover movement aborted: ESP32 did not respond within {settings.ESP32_TIMEOUT_SECONDS}s. No movement confirmed."
            )

        except ESP32ConnectionError as exc:
            self.state = RoverState.DISCONNECTED
            self.esp32_connected = False
            self.confirmation_message = f"Connection Failed: {str(exc)}"
            await self.broadcast_status()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Rover movement blocked: Cannot connect to ESP32 at {settings.ESP32_BASE_URL}. Check rover power and WiFi."
            )

        except ESP32CommandRejectedError as exc:
            self.state = RoverState.ERROR
            self.confirmation_message = f"Hardware Rejection: {str(exc)}"
            await self.broadcast_status()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ESP32 rejected move command: {str(exc)}"
            )

    async def turn(self, direction: TurnDirection, angle: float) -> CommandResponse:
        """
        Executes discrete rotational turn:
        1. Dispatches to physical ESP32
        2. Strictly waits for ESP32 HTTP 200 acknowledgment
        3. Updates state and broadcasts to WebSockets
        """
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cmd_str = f"TURN {direction.value.upper()} ({angle}°)"

        try:
            esp32_ack = await esp32_service.send_turn(direction.value, angle)

            self.state = RoverState.TURNING
            self.current_command = cmd_str
            self.last_command = cmd_str
            self.last_command_timestamp = timestamp_str
            self.confirmation_message = f"Hardware confirmed: Executing TURN {direction.value.upper()} by {angle}°."
            self.emergency_stopped = False
            self.esp32_connected = True
            self.esp32_last_seen = timestamp_str

            await self.broadcast_status()

            return CommandResponse(
                status="success",
                rover_state=self.state.value,
                current_command=cmd_str,
                last_command=cmd_str,
                last_command_timestamp=timestamp_str,
                confirmation=self.confirmation_message,
                esp32_acknowledged=True,
                direction=direction.value,
                angle=angle,
                timestamp=time.time()
            )

        except ESP32TimeoutError as exc:
            self.state = RoverState.ERROR
            self.esp32_connected = False
            self.confirmation_message = f"Hardware Timeout: {str(exc)}"
            await self.broadcast_status()
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Rover turn aborted: ESP32 did not respond within {settings.ESP32_TIMEOUT_SECONDS}s. No turn confirmed."
            )

        except ESP32ConnectionError as exc:
            self.state = RoverState.DISCONNECTED
            self.esp32_connected = False
            self.confirmation_message = f"Connection Failed: {str(exc)}"
            await self.broadcast_status()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Rover turn blocked: Cannot connect to ESP32 at {settings.ESP32_BASE_URL}."
            )

        except ESP32CommandRejectedError as exc:
            self.state = RoverState.ERROR
            self.confirmation_message = f"Hardware Rejection: {str(exc)}"
            await self.broadcast_status()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ESP32 rejected turn command: {str(exc)}"
            )

    async def emergency_stop(self) -> StopResponse:
        """
        PRIORITY EMERGENCY STOP:
        Immediately cut power to all motors and latch STOPPED state.
        Always returns promptly even if ESP32 network is degraded.
        """
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cmd_str = "EMERGENCY STOP"
        
        # Priority local failsafe latch
        self.state = RoverState.STOPPED
        self.current_command = cmd_str
        self.last_command = cmd_str
        self.last_command_timestamp = timestamp_str
        self.emergency_stopped = True

        esp32_acked = False
        try:
            # Priority dispatch to ESP32
            await esp32_service.send_emergency_stop()
            esp32_acked = True
            self.esp32_connected = True
            self.esp32_last_seen = timestamp_str
            self.confirmation_message = "EMERGENCY BRAKE ENGAGED. Physical motors cut off immediately."
        except Exception as exc:
            logger.error(f"[EmergencyStop] ESP32 remote call encountered: {exc}. Local brake active.")
            self.confirmation_message = f"Local Emergency Brake engaged (ESP32 notice: {str(exc)})."

        # Instant WebSocket broadcast of STOP state
        await self.broadcast_status()

        return StopResponse(
            status="STOPPED",
            rover_state="STOPPED",
            current_command=cmd_str,
            last_command=cmd_str,
            last_command_timestamp=timestamp_str,
            confirmation=self.confirmation_message,
            esp32_acknowledged=esp32_acked,
            emergency_stopped=True,
            timestamp=time.time()
        )

    # ----------------- STATUS & TELEMETRY -----------------

    async def get_status(self) -> RoverStatus:
        """
        Fetches combined real status.
        Never fakes values: if ESP32 is offline, reports DISCONNECTED.
        """
        # Query ESP32 for real sensor data
        raw_telemetry = await esp32_service.get_hardware_telemetry()
        
        if raw_telemetry:
            self.esp32_connected = True
            self.esp32_last_seen = time.strftime("%Y-%m-%d %H:%M:%S")
            # Extract real sensor data if provided by ESP32 firmware
            if "battery_percentage" in raw_telemetry:
                self.battery_percentage = raw_telemetry["battery_percentage"]
            if "battery_voltage" in raw_telemetry:
                self.battery_voltage = raw_telemetry["battery_voltage"]
            if "distance_cm" in raw_telemetry or "obstacle_distance_cm" in raw_telemetry:
                self.obstacle_distance_cm = raw_telemetry.get("distance_cm") or raw_telemetry.get("obstacle_distance_cm")
            if "speed" in raw_telemetry:
                self.speed = raw_telemetry["speed"]
            if "state" in raw_telemetry and self.state not in (RoverState.MOVING, RoverState.TURNING):
                try:
                    self.state = RoverState(raw_telemetry["state"])
                except Exception:
                    pass
        else:
            # Physical ESP32 is offline or unreachable - report DISCONNECTED without redundant double-timeout
            self.esp32_connected = False
            if not self.emergency_stopped:
                self.state = RoverState.DISCONNECTED

        status_str = "ONLINE" if self.esp32_connected else "DISCONNECTED"

        return RoverStatus(
            status=status_str,
            rover_state=self.state.value,
            current_command=self.current_command,
            last_command=self.last_command,
            last_command_timestamp=self.last_command_timestamp,
            confirmation_message=self.confirmation_message,
            emergency_stopped=self.emergency_stopped,
            esp32_connected=self.esp32_connected,
            esp32_url=settings.ESP32_BASE_URL,
            esp32_last_seen=self.esp32_last_seen,
            battery_percentage=self.battery_percentage,
            battery_voltage=self.battery_voltage,
            obstacle_distance_cm=self.obstacle_distance_cm,
            speed=self.speed,
            current_mood=getattr(self, "_cached_mood", "IDLE"),
            server_time=time.time()
        )

    # ----------------- BACKGROUND TELEMETRY LOOP -----------------

    async def start_telemetry_loop(self):
        """Starts background periodic polling and WebSocket broadcasting."""
        while True:
            try:
                await self.broadcast_status()
            except Exception as e:
                logger.error(f"[TelemetryLoop] Error in broadcast cycle: {e}")
            await asyncio.sleep(settings.STATUS_POLL_INTERVAL_SECONDS)

# Global Singleton Instance
rover_service = RoverService()

