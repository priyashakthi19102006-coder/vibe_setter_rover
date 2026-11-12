"""
VIBESETTER OS - Expressions & Affective Mood Router
===================================================
Manages the rover's facial OLED matrix, emotional states, ambient underglow
lighting, and mood synchronization with the physical ESP32.
"""

import time
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.esp32_service import esp32_service
from backend.services.rover_service import rover_service

logger = logging.getLogger("vibesetter.expressions")

router = APIRouter(prefix="/api/expressions", tags=["Expressions & OLED Face Matrix"])

# In-memory mood state
_current_mood = {
    "activeExpression": "vibe",
    "moodTitle": "Euphoric & Playful",
    "subtitle": "Synchronized with your vibe",
    "energy": 88,
    "valence": 92,
    "focus": 76,
    "auraColor": "#a855f7",
    "ledPattern": "wave_pulse",
    "lastUpdated": time.time()
}

EXPRESSION_DESCRIPTIONS = {
    "happy": ("Joyful Sparks", "Cheerful and upbeat mood"),
    "curious": ("Curious Scan", "Sensors probing environment"),
    "cyber": ("Cyberpunk HUD", "Analytical telemetry mode"),
    "vibe": ("Music Sync", "Euphoric acoustic resonance"),
    "fierce": ("Guardian Mode", "Protective security perimeter"),
    "chill": ("Zen Orbit", "Calm and meditative cruise"),
    "wink": ("Playful Wink", "Playful companion interaction"),
    "matrix": ("Code Rain", "Full matrix synchronization")
}


class SetExpressionRequest(BaseModel):
    expressionId: str = Field(..., description="ID of expression: happy, curious, cyber, vibe, fierce, chill, wink, matrix")

class UpdateMoodRequest(BaseModel):
    energy: Optional[int] = Field(None, ge=0, le=100)
    valence: Optional[int] = Field(None, ge=0, le=100)
    focus: Optional[int] = Field(None, ge=0, le=100)
    auraColor: Optional[str] = Field(None)
    ledPattern: Optional[str] = Field(None)


@router.get("/current", summary="Get current rover expression and mood state")
async def get_current_expression():
    return _current_mood


@router.post("/set", summary="Set facial OLED expression on the physical rover")
async def set_expression(req: SetExpressionRequest):
    exp_id = req.expressionId.lower().strip()
    title, subtitle = EXPRESSION_DESCRIPTIONS.get(exp_id, (exp_id.capitalize(), "Custom expression"))

    _current_mood["activeExpression"] = exp_id
    _current_mood["moodTitle"] = title
    _current_mood["subtitle"] = subtitle
    _current_mood["lastUpdated"] = time.time()

    # Attempt to dispatch to physical ESP32 OLED if connected
    esp32_ack = False
    if rover_service.esp32_connected:
        try:
            res = await esp32_service.client.post(
                f"{esp32_service.base_url}/expression",
                json={"expression": exp_id},
                timeout=1.5
            )
            esp32_ack = res.status_code == 200
        except Exception as e:
            logger.warning(f"[Expressions] ESP32 expression dispatch failed: {e}")

    logger.info(f"[Expressions] Set expression to '{exp_id}' (ESP32 ACK: {esp32_ack})")

    return {
        "status": "success",
        "expressionId": exp_id,
        "expressionTitle": title,
        "esp32_dispatched": esp32_ack,
        "timestamp": time.time()
    }


@router.post("/mood", summary="Update emotional energy, valence, and aura lighting")
async def update_mood(req: UpdateMoodRequest):
    if req.energy is not None:
        _current_mood["energy"] = req.energy
    if req.valence is not None:
        _current_mood["valence"] = req.valence
    if req.focus is not None:
        _current_mood["focus"] = req.focus
    if req.auraColor is not None:
        _current_mood["auraColor"] = req.auraColor
    if req.ledPattern is not None:
        _current_mood["ledPattern"] = req.ledPattern
    _current_mood["lastUpdated"] = time.time()

    return {
        "status": "success",
        "mood": _current_mood,
        "timestamp": time.time()
    }

