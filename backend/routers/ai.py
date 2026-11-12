"""
VIBESETTER OS - AI Companion & Neural Brain Router
==================================================
Exposes endpoints for local Ollama 3B model inference, companion personality,
TTS audio generation, and live AI subsystem status.

ENDPOINTS:
- GET /api/ai/status
- POST /api/ai/query
- POST /api/ai/tts/synthesize
- GET /api/ai/tts/audio/{audio_filename}
"""

import time
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.config import settings
from backend.services.ollama_service import ollama_service, ROVER_SYSTEM_PROMPT
from backend.services.tts_service import tts_service
from backend.services.rover_service import rover_service
from backend.services.mood_service import mood_service

logger = logging.getLogger("vibesetter.ai_router")

router = APIRouter(prefix="/api/ai", tags=["AI Companion & Ollama Brain"])


# ----------------- SCHEMAS -----------------

class AIQueryRequest(BaseModel):
    prompt: str = Field(..., description="User prompt or conversational query")
    history: Optional[List[Dict[str, str]]] = Field(None, description="Previous conversation turns")
    include_tts: bool = Field(True, description="Whether to pre-render speech audio")

class TTSSynthesizeRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize into speech audio")


# ----------------- 1. AI STATUS ENDPOINT -----------------

@router.get(
    "/status",
    summary="Get Ollama 3B connection status, model health, and TTS metrics",
    description="Returns live connection state to local Ollama instance, model latency, and TTS status."
)
async def ai_status():
    """
    GET /api/ai/status
    Surfaces real connection metrics to the frontend.
    """
    ollama_health = await ollama_service.check_health()
    tts_status = tts_service.get_status()

    return {
        "status": "ONLINE" if ollama_health.get("connected") else "LOCAL_FALLBACK",
        "model": settings.OLLAMA_MODEL,
        "personality": "VIBESETTER Cyber Companion",
        "ollama": ollama_health,
        "tts": tts_status,
        "system_prompt": ROVER_SYSTEM_PROMPT.strip(),
        "server_time": time.time()
    }


# ----------------- 2. CONVERSATIONAL QUERY ENDPOINT -----------------

@router.post(
    "/query",
    summary="Send prompt to local Ollama 3B model with rover situational telemetry",
    description="Conversational chat with Ollama 3B. Physical motors CANNOT be commanded through this endpoint."
)
async def ai_query(req: AIQueryRequest):
    """
    POST /api/ai/query
    ```json
    {
      "prompt": "How are you doing today?",
      "include_tts": true
    }
    ```
    """
    start_time = time.perf_counter()

    # Transition OLED eyes to THINKING while Ollama 3B processes
    await mood_service.set_mood("THINKING")

    # Pass physical rover telemetry to Ollama for situational grounding
    telemetry = {
        "rover_state": rover_service.state.value,
        "battery_percentage": rover_service.battery_percentage,
        "battery_voltage": rover_service.battery_voltage,
        "esp32_connected": rover_service.esp32_connected
    }

    # Generate reply using local Ollama model (with friendly companion persona)
    reply_text = await ollama_service.chat(
        prompt=req.prompt,
        conversation_history=req.history,
        telemetry=telemetry
    )

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)

    # Transition eyes to TALKING or HAPPY based on conversation tone
    lower_reply = reply_text.lower()
    if any(w in lower_reply for w in ["love", "happy", "joy", "awesome", "great", "fun", "vibe", "cool", "explore", "excited"]):
        await mood_service.set_mood("HAPPY", auto_revert_sec=8.0)
    else:
        await mood_service.set_mood("TALKING", auto_revert_sec=6.0)

    # Synthesize speech audio if requested
    audio_url = None
    if req.include_tts and reply_text:
        try:
            tts_res = await tts_service.synthesize(reply_text)
            if tts_res.get("success"):
                audio_url = tts_res.get("audio_url")
        except Exception as e:
            logger.warning(f"[AI Query] TTS synthesis skipped: {e}")

    return {
        "id": f"ai-{int(time.time() * 1000)}",
        "prompt": req.prompt,
        "reply": reply_text,
        "audio_url": audio_url,
        "mood": "energetic",
        "model": settings.OLLAMA_MODEL,
        "ollama_online": ollama_service.is_connected,
        "latency_ms": elapsed_ms,
        "timestamp": time.strftime("%H:%M:%S")
    }


# ----------------- 3. DIRECT TTS SYNTHESIS ENDPOINT -----------------

@router.post(
    "/tts/synthesize",
    summary="Generate speech audio for arbitrary text",
    description="Synthesizes text and returns playable audio URL."
)
async def tts_synthesize(req: TTSSynthesizeRequest):
    res = await tts_service.synthesize(req.text)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.get("error", "TTS synthesis failed")
        )
    return res


# ----------------- 4. TTS AUDIO STREAM / FILE SERVING -----------------

@router.get(
    "/tts/audio/{audio_filename}",
    summary="Stream synthesized speech audio file",
    description="Streams the .wav audio file for playback in browser audio players."
)
async def get_tts_audio(audio_filename: str):
    # Sanitize filename
    clean_name = Path(audio_filename).name
    if not clean_name.endswith(".wav"):
        clean_name = f"{clean_name}.wav"

    audio_path = tts_service.output_dir / clean_name
    if not audio_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file '{clean_name}' not found"
        )

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename=clean_name
    )

