"""
VIBESETTER OS - Text-To-Speech (TTS) Service Abstraction
========================================================
Generates speech audio from AI companion text responses, returns streaming audio URLs,
and allows the frontend to play audible responses through speakers.

Features:
- Thread-safe pyttsx3 speech synthesis engine.
- Deterministic MD5 content caching (eliminates redundant synthesis).
- Returns playable audio URL (/api/ai/tts/audio/{audio_id}.wav).
- Audio cleanup / cache management.
"""

import os
import sys
import time
import hashlib
import asyncio
import threading
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from backend.config import settings

logger = logging.getLogger("vibesetter.tts")

_tts_lock = threading.Lock()


class TTSService:
    def __init__(self):
        self.engine_name: str = settings.TTS_ENGINE
        self.output_dir: Path = Path(settings.TTS_AUDIO_DIR).resolve()
        self.voice_rate: int = settings.TTS_VOICE_RATE
        self.voice_volume: float = settings.TTS_VOICE_VOLUME

        # Ensure audio cache directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"[TTS] Initialized TTS cache at: {self.output_dir}")

    def _get_audio_id(self, text: str) -> str:
        """Computes deterministic hash for speech text."""
        normalized = text.strip().lower()
        return hashlib.md5(normalized.encode("utf-8")).hexdigest()[:12]

    def get_audio_path(self, audio_id: str) -> Path:
        """Returns the absolute file path for a given audio ID."""
        return self.output_dir / f"{audio_id}.wav"

    def is_cached(self, audio_id: str) -> bool:
        """Checks if pre-rendered audio exists and is non-empty."""
        path = self.get_audio_path(audio_id)
        return path.exists() and path.stat().st_size > 0

    def _synthesize_pyttsx3(self, text: str, output_path: Path):
        """
        Thread-safe synchronous pyttsx3 synthesis.
        Runs inside asyncio.to_thread to avoid blocking async event loop.
        """
        with _tts_lock:
            import pyttsx3
            engine = pyttsx3.init()
            try:
                engine.setProperty("rate", self.voice_rate)
                engine.setProperty("volume", self.voice_volume)

                # Attempt to set female or higher-pitch cyber voice if available
                voices = engine.getProperty("voices")
                if voices:
                    for v in voices:
                        if "zira" in v.name.lower() or "eva" in v.name.lower() or "female" in v.name.lower():
                            engine.setProperty("voice", v.id)
                            break

                engine.save_to_file(text, str(output_path))
                engine.runAndWait()
            finally:
                engine.stop()

    async def synthesize(self, text: str) -> Dict[str, Any]:
        """
        Synthesizes text into a speech audio file and returns playable URL.
        """
        clean_text = (text or "").strip()
        if not clean_text:
            return {
                "success": False,
                "error": "Empty text provided for synthesis",
                "audio_url": None
            }

        audio_id = self._get_audio_id(clean_text)
        audio_file = self.get_audio_path(audio_id)
        audio_url = f"/api/ai/tts/audio/{audio_id}.wav"

        # Check if already cached
        if self.is_cached(audio_id):
            return {
                "success": True,
                "audio_id": audio_id,
                "audio_url": audio_url,
                "format": "audio/wav",
                "cached": True,
                "text": clean_text
            }

        start = time.perf_counter()
        try:
            # Run synthesis in background worker thread
            await asyncio.to_thread(self._synthesize_pyttsx3, clean_text, audio_file)
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

            if audio_file.exists() and audio_file.stat().st_size > 0:
                file_size = audio_file.stat().st_size
                logger.info(f"[TTS] Synthesized '{audio_id}.wav' ({file_size} bytes) in {elapsed_ms}ms")
                return {
                    "success": True,
                    "audio_id": audio_id,
                    "audio_url": audio_url,
                    "format": "audio/wav",
                    "file_size_bytes": file_size,
                    "latency_ms": elapsed_ms,
                    "cached": False,
                    "text": clean_text
                }
            else:
                logger.warning(f"[TTS] Synthesis output file is missing or empty: {audio_file}")
                return {
                    "success": False,
                    "error": "Synthesis output was empty",
                    "audio_url": None
                }

        except Exception as exc:
            logger.error(f"[TTS] Speech synthesis error: {exc}", exc_info=True)
            return {
                "success": False,
                "error": str(exc),
                "audio_url": None
            }

    def get_status(self) -> Dict[str, Any]:
        """Returns TTS subsystem health and cache metrics."""
        cached_count = len(list(self.output_dir.glob("*.wav")))
        return {
            "status": "ONLINE",
            "engine": self.engine_name,
            "cache_dir": str(self.output_dir),
            "cached_audio_files": cached_count,
            "voice_rate": self.voice_rate,
            "voice_volume": self.voice_volume
        }


# Singleton instance
tts_service = TTSService()

