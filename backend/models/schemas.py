"""
VIBESETTER OS - Data Schemas & Validation Models
================================================
Defines strict Pydantic models for physical rover commands, responses,
safety boundaries, and real-time status telemetry.
"""

from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

class MoveDirection(str, Enum):
    FORWARD = "forward"
    BACKWARD = "backward"
    LEFT = "left"
    RIGHT = "right"

class TurnDirection(str, Enum):
    LEFT = "left"
    RIGHT = "right"

class RoverState(str, Enum):
    IDLE = "IDLE"
    MOVING = "MOVING"
    TURNING = "TURNING"
    STOPPED = "STOPPED"
    ERROR = "ERROR"
    DISCONNECTED = "DISCONNECTED"

# ----------------- INCOMING COMMAND SCHEMAS -----------------

class MoveCommand(BaseModel):
    """
    POST /api/rover/move
    {
      "direction": "forward",
      "distance_cm": 100
    }
    """
    direction: MoveDirection = Field(
        ..., 
        description="Movement direction: 'forward', 'backward', 'left', 'right'"
    )
    distance_cm: float = Field(
        ..., 
        gt=0, 
        le=500.0, 
        description="Distance to travel in centimeters (range: 1.0 - 500.0 cm)"
    )

    @field_validator("distance_cm")
    def validate_distance(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Distance must be strictly greater than 0 cm.")
        if v > 500.0:
            raise ValueError("Distance exceeds maximum safety limit of 500.0 cm (5 meters).")
        return round(v, 2)

class TurnCommand(BaseModel):
    """
    POST /api/rover/turn
    {
      "direction": "left",
      "angle": 90
    }
    """
    direction: TurnDirection = Field(
        ..., 
        description="Rotation direction: 'left' or 'right'"
    )
    angle: float = Field(
        ..., 
        gt=0, 
        le=360.0, 
        description="Rotation angle in degrees (range: 1.0 - 360.0°)"
    )

    @field_validator("angle")
    def validate_angle(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Turn angle must be strictly greater than 0°.")
        if v > 360.0:
            raise ValueError("Turn angle cannot exceed 360°.")
        return round(v, 2)

# ----------------- OUTGOING RESPONSE SCHEMAS -----------------

class CommandResponse(BaseModel):
    status: str = Field(..., description="'success' or 'failed'")
    rover_state: str = Field(..., description="Current hardware state: MOVING, TURNING, IDLE, etc.")
    current_command: str
    last_command: str
    last_command_timestamp: str
    confirmation: str
    esp32_acknowledged: bool = Field(..., description="True ONLY when physical ESP32 returned HTTP 200 ACK")
    direction: Optional[str] = None
    distance_cm: Optional[float] = None
    angle: Optional[float] = None
    timestamp: float

class StopResponse(BaseModel):
    status: str = "STOPPED"
    rover_state: str = "STOPPED"
    current_command: str = "EMERGENCY STOP"
    last_command: str = "EMERGENCY STOP"
    last_command_timestamp: str
    confirmation: str
    esp32_acknowledged: bool
    emergency_stopped: bool = True
    timestamp: float

class RoverStatus(BaseModel):
    """
    GET /api/rover/status
    """
    status: str = Field(..., description="'ONLINE' or 'DISCONNECTED'")
    rover_state: str = Field(..., description="IDLE, MOVING, TURNING, STOPPED, or DISCONNECTED")
    current_command: str
    last_command: str
    last_command_timestamp: str
    confirmation_message: str
    emergency_stopped: bool
    esp32_connected: bool
    esp32_url: str
    esp32_last_seen: Optional[str] = None
    battery_percentage: Optional[float] = None
    battery_voltage: Optional[float] = None
    obstacle_distance_cm: Optional[float] = None
    speed: Optional[float] = None
    current_mood: Optional[str] = "IDLE"
    server_time: float

# ----------------- ESP32 PROTOCOL SCHEMAS -----------------

class ESP32MovePayload(BaseModel):
    direction: str
    distance_cm: float

class ESP32TurnPayload(BaseModel):
    direction: str
    angle: float

# ----------------- VOICE COMMAND SCHEMAS -----------------

class VoiceProcessRequest(BaseModel):
    """
    POST /api/voice/process
    Accepts speech transcription or base64 audio payload
    """
    transcript: Optional[str] = Field(None, description="Direct text transcription from browser speech recognition or text input")
    text: Optional[str] = Field(None, description="Alias for transcript")
    audio_base64: Optional[str] = Field(None, description="Optional raw base64-encoded audio for processing")
    session_id: Optional[str] = Field("default", description="Conversation session ID for tracking clarification context")

class VoiceProcessResponse(BaseModel):
    """
    Mandatory Contract:
    {
      "transcript": "...",
      "intent": "...",
      "action": "...",
      "response": "..."
    }
    """
    transcript: str = Field(..., description="The processed or transcribed text")
    intent: str = Field(..., description="Identified intent (e.g. MOVE_FORWARD, EMERGENCY_STOP, GENERAL_CONVERSATION)")
    action: str = Field(..., description="Action taken or required (e.g. EXECUTE_MOVE, REQUEST_CLARIFICATION)")
    response: str = Field(..., description="Verbal or text response for the AI companion")
    needs_clarification: bool = Field(False, description="True if parameter like distance is missing and must be clarified")
    clarification_prompt: Optional[str] = Field(None, description="Targeted prompt to ask the user")
    command_payload: Optional[Dict[str, Any]] = Field(None, description="Extracted structured parameters")
    executed: bool = Field(False, description="True ONLY if physical rover command was successfully executed or dispatched")
    execution_result: Optional[Dict[str, Any]] = Field(None, description="Physical hardware response if executed")
    rover_state: Optional[str] = Field(None, description="Current rover state")
    audio_url: Optional[str] = Field(None, description="Playable URL of synthesized speech audio stream")
    timestamp: float = Field(..., description="Unix epoch timestamp")


