"""
VIBESETTER OS - Voice Command API Router
========================================
Exposes endpoints for the Voice AI pipeline:
- POST /api/voice/process
- GET /api/voice/status
- POST /api/voice/clear-session
"""

import time
import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.models.schemas import VoiceProcessRequest, VoiceProcessResponse
from backend.services.voice_service import voice_service

logger = logging.getLogger("vibesetter.voice_router")

router = APIRouter(prefix="/api/voice", tags=["Voice AI Pipeline"])


@router.post(
    "/process",
    response_model=VoiceProcessResponse,
    summary="Process spoken voice audio or transcript through the Safe Command Pipeline",
    description="""
    Accepts speech transcription or base64 audio and runs the full pipeline:
    Speech/Text -> Intent Classification -> Structured Parameter Extraction ->
    Safety Validation -> Physical Rover Command.

    If movement distance is missing, asks the user for clarification rather than guessing.
    """
)
async def process_voice(payload: VoiceProcessRequest):
    """
    POST /api/voice/process
    ```json
    {
      "transcript": "move forward 50 cm",
      "session_id": "session-123"
    }
    ```
    """
    try:
        response = await voice_service.process_voice_input(payload)
        return response
    except Exception as exc:
        logger.error(f"[Voice API] Error processing voice input: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice processing pipeline error: {str(exc)}"
        )


@router.get(
    "/status",
    summary="Get Voice AI subsystem status",
    description="Returns availability of voice processing and active session details."
)
async def voice_status():
    return {
        "status": "ONLINE",
        "pipeline": [
            "Microphone Stream",
            "Speech-to-Text",
            "Intent Detection",
            "Safe Command Router",
            "Rover / Companion Response"
        ],
        "supported_intents": [
            "MOVE_FORWARD",
            "MOVE_BACKWARD",
            "MOVE_LEFT",
            "MOVE_RIGHT",
            "TURN_LEFT",
            "TURN_RIGHT",
            "EMERGENCY_STOP",
            "PLAY_MUSIC",
            "STOP_MUSIC",
            "CHANGE_EXPRESSION",
            "GENERAL_CONVERSATION"
        ],
        "mandatory_clarifications": [
            "Missing distance on movement commands",
            "Missing angle on rotation commands"
        ],
        "server_time": time.time()
    }


class ClearSessionRequest(BaseModel):
    session_id: Optional[str] = "default"


@router.post(
    "/clear-session",
    summary="Clear pending conversational clarification for a session"
)
async def clear_session(req: ClearSessionRequest):
    voice_service._clear_pending(req.session_id or "default")
    return {"status": "cleared", "session_id": req.session_id}

