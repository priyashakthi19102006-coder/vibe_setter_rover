"""
VIBESETTER OS - Music & Lyrics API Router
=========================================
Endpoints:
- GET  /api/music/library       - List available tracks with metadata
- POST /api/music/play          - Start/resume playback (with optional song_id)
- POST /api/music/pause         - Pause playback
- POST /api/music/stop          - Stop playback and reset
- GET  /api/music/status        - Real-time status, progress, volume, hardware sync
- GET  /api/music/lyrics/{id}   - Timestamped LRC lyrics array
- GET  /api/music/stream/{id}   - Stream synthesized royalty-free audio file
"""

import os
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.services.music_service import music_service

logger = logging.getLogger("vibesetter.music_router")

router = APIRouter(prefix="/api/music", tags=["Music & Lyrics System"])


# ----------------- SCHEMAS -----------------

class PlayMusicRequest(BaseModel):
    song_id: Optional[str] = Field(None, description="Optional ID of song to load and play")

class VolumeRequest(BaseModel):
    volume: int = Field(..., ge=0, le=100, description="Volume level between 0 and 100")

class MediaCommandRequest(BaseModel):
    command: str = Field(..., description="'play', 'pause', 'toggle_play', 'stop', 'next', 'prev', 'volume'")
    payload: Optional[Dict[str, Any]] = None

class ReactiveLedsRequest(BaseModel):
    enabled: bool
    mode: Optional[str] = "spectrum"


# ----------------- 1. CORE MUSIC API CONTRACT -----------------

@router.get(
    "/library",
    summary="Get royalty-free music library",
    description="Returns the catalog of royalty-free songs with titles, durations, artists, and lyrics availability."
)
async def get_music_library():
    songs = music_service.get_library()
    return {
        "status": "success",
        "total": len(songs),
        "songs": songs
    }


@router.post(
    "/play",
    summary="Start or resume music playback",
    description="Commands playback and triggers rover OLED expression EXCITED."
)
async def play_music(req: Optional[PlayMusicRequest] = None):
    song_id = req.song_id if req else None
    stat = await music_service.play(song_id)
    return {
        "status": "success",
        "message": "Playback started",
        "playback": stat
    }


@router.post(
    "/pause",
    summary="Pause music playback",
    description="Pauses current track position and shifts rover expression to HAPPY."
)
async def pause_music():
    stat = await music_service.pause()
    return {
        "status": "success",
        "message": "Playback paused",
        "playback": stat
    }


@router.post(
    "/stop",
    summary="Stop music playback",
    description="Stops playback, resets progress to 0, and shifts rover expression to IDLE."
)
async def stop_music():
    stat = await music_service.stop()
    return {
        "status": "success",
        "message": "Playback stopped",
        "playback": stat
    }


@router.get(
    "/status",
    summary="Get current playback and lyrics status",
    description="Returns active song details, current time in seconds, volume, rover mood, and hardware confirmation."
)
async def get_music_status():
    return music_service.get_status()


@router.get(
    "/lyrics/{song_id}",
    summary="Get timestamped LRC lyrics for a song",
    description="Returns array of timestamped lyrics objects [{'time': 12.5, 'text': '...'}]"
)
async def get_song_lyrics(song_id: str):
    song = music_service.get_song(song_id)
    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Song with ID '{song_id}' not found in library"
        )
    lyrics = music_service.get_lyrics(song_id)
    return {
        "status": "success",
        "song_id": song_id,
        "title": song["title"],
        "has_lyrics": len(lyrics) > 0,
        "lyrics": lyrics
    }


@router.get(
    "/stream/{song_id}",
    summary="Stream synthesized royalty-free audio file",
    description="Serves 16-bit 22.05kHz WAV audio stream directly for HTML5 audio element."
)
async def stream_audio_file(song_id: str):
    filepath = music_service.get_audio_path(song_id)
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio file for '{song_id}' could not be located or generated"
        )
    return FileResponse(
        filepath,
        media_type="audio/wav",
        filename=f"{song_id}.wav"
    )


# ----------------- 2. COMPATIBILITY ROUTES -----------------

@router.get("/state", summary="Legacy audio state route", include_in_schema=False)
async def get_legacy_state():
    stat = music_service.get_status()
    current_song = stat["current_song"]
    return {
        "isPlaying": stat["is_playing"],
        "volume": stat["volume"],
        "bassBoost": stat["bass_boost"],
        "reactiveLeds": stat["reactive_leds"],
        "visualizerMode": "spectrum",
        "currentTrack": {
            "id": current_song["id"],
            "title": current_song["title"],
            "artist": current_song["artist"],
            "bpm": current_song["bpm"],
            "durationSec": current_song["duration_sec"],
            "progressSec": stat["progress_sec"]
        }
    }


@router.get("/playlist", summary="Legacy playlist route", include_in_schema=False)
async def get_legacy_playlist():
    return [
        {
            "id": s["id"],
            "title": s["title"],
            "artist": s["artist"],
            "duration": f"{int(s['duration_sec'] // 60)}:{int(s['duration_sec'] % 60):02d}",
            "mood": s.get("mood_tag", "Cyber"),
            "bpm": s.get("bpm", 128)
        }
        for s in music_service.get_library()
    ]


@router.post("/control", summary="Legacy media control route", include_in_schema=False)
async def legacy_media_control(req: MediaCommandRequest):
    cmd = req.command.lower().strip()
    library = music_service.get_library()

    if cmd in ["play", "resume"]:
        stat = await music_service.play()
    elif cmd in ["pause"]:
        stat = await music_service.pause()
    elif cmd in ["stop"]:
        stat = await music_service.stop()
    elif cmd == "toggle_play":
        if music_service.is_playing:
            stat = await music_service.pause()
        else:
            stat = await music_service.play()
    elif cmd == "next":
        idx = next((i for i, s in enumerate(library) if s["id"] == music_service.current_song_id), 0)
        next_song = library[(idx + 1) % len(library)]
        stat = await music_service.play(next_song["id"])
    elif cmd == "prev":
        idx = next((i for i, s in enumerate(library) if s["id"] == music_service.current_song_id), 0)
        prev_song = library[(idx - 1) % len(library)]
        stat = await music_service.play(prev_song["id"])
    elif cmd == "volume" and req.payload and "volume" in req.payload:
        music_service.set_volume(int(req.payload["volume"]))
        stat = music_service.get_status()
    else:
        stat = music_service.get_status()

    return {
        "status": "success",
        "command": cmd,
        "isPlaying": stat["is_playing"],
        "currentTrack": stat["current_song"],
        "volume": stat["volume"]
    }


@router.post("/reactive-leds", summary="Toggle reactive LEDs", include_in_schema=False)
async def toggle_reactive_leds(req: ReactiveLedsRequest):
    music_service.reactive_leds = req.enabled
    return {
        "status": "success",
        "reactiveLeds": music_service.reactive_leds,
        "visualizerMode": req.mode or "spectrum"
    }
