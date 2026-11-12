"""
VIBESETTER OS - Mood & Emotion API Router
=========================================
Endpoints for querying and triggering rover affective states:
- POST /api/mood/set
- GET /api/mood/current
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.services.mood_service import mood_service, RoverMood

logger = logging.getLogger("vibesetter.mood_router")

router = APIRouter(prefix="/api/mood", tags=["Emotion & Expressions Engine"])


class SetMoodRequest(BaseModel):
    mood: str = Field(
        ...,
        description="Mood state: HAPPY, EXCITED, SAD, ANGRY, SLEEPY, THINKING, LISTENING, TALKING, IDLE"
    )
    auto_revert_sec: Optional[float] = Field(
        None,
        description="Optional seconds after which to automatically revert to IDLE"
    )


@router.get(
    "/current",
    summary="Get current rover emotion, eye pattern, and OLED sync state",
    description="Returns active mood state, energy, valence, aura color, and ESP32 sync status."
)
async def get_current_mood():
    """
    GET /api/mood/current
    """
    return mood_service.get_current_mood()


@router.post(
    "/set",
    summary="Set rover mood and update physical ESP32 OLED eyes",
    description="Validates mood state and immediately commands the OLED screen."
)
async def set_mood(req: SetMoodRequest):
    """
    POST /api/mood/set
    ```json
    {
      "mood": "HAPPY",
      "auto_revert_sec": 5.0
    }
    ```
    """
    result = await mood_service.set_mood(
        mood_input=req.mood,
        auto_revert_sec=req.auto_revert_sec,
        source="api_request"
    )
    return {
        "status": "success",
        "mood_state": result
    }

