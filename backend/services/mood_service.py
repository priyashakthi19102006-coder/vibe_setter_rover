"""
VIBESETTER OS - Affective Emotion & Mood Engine Service
======================================================
Coordinates rover facial expressions, affective states, and OLED animations:
- HAPPY
- EXCITED
- SAD
- ANGRY
- SLEEPY
- THINKING
- LISTENING
- TALKING
- IDLE

SYSTEM BEHAVIORS:
- Microphone active -> LISTENING
- Ollama processing -> THINKING
- AI speaking -> TALKING
- Positive interaction -> HAPPY / EXCITED
- No activity -> IDLE (transitions to SLEEPY after prolonged inactivity)

HARDWARE DISPATCH:
Dispatches validated mood changes to physical ESP32 via HTTP POST /mood.
Broadcasts live mood changes to connected WebSocket clients.
"""

import time
import asyncio
import logging
from enum import Enum
from typing import Optional, Dict, Any, List

from backend.config import settings
from backend.services.esp32_service import esp32_service
from backend.services.rover_service import rover_service

logger = logging.getLogger("vibesetter.mood")


class RoverMood(str, Enum):
    HAPPY = "HAPPY"
    EXCITED = "EXCITED"
    SAD = "SAD"
    ANGRY = "ANGRY"
    SLEEPY = "SLEEPY"
    THINKING = "THINKING"
    LISTENING = "LISTENING"
    TALKING = "TALKING"
    IDLE = "IDLE"


MOOD_METRICS = {
    RoverMood.HAPPY: {
        "title": "Joyful Resonance",
        "description": "Upbeat, playful, and cheerful state.",
        "valence": 95,
        "energy": 85,
        "focus": 80,
        "auraColor": "#a855f7",  # Neon Purple
        "eyePattern": "curved_arch"
    },
    RoverMood.EXCITED: {
        "title": "Hyper Adrenaline",
        "description": "High-energy euphoria and exploration excitement.",
        "valence": 98,
        "energy": 100,
        "focus": 90,
        "auraColor": "#d946ef",  # Electric Magenta
        "eyePattern": "wide_pulsing"
    },
    RoverMood.SAD: {
        "title": "Low Frequency",
        "description": "Lowered eyelids, gloomy glitch mood.",
        "valence": 20,
        "energy": 30,
        "focus": 40,
        "auraColor": "#3b82f6",  # Glitch Blue
        "eyePattern": "drooping_slant"
    },
    RoverMood.ANGRY: {
        "title": "Guardian Threat Mode",
        "description": "Combative slant eyes, defense perimeter alert.",
        "valence": 15,
        "energy": 92,
        "focus": 95,
        "auraColor": "#f43f5e",  # Crimson Red
        "eyePattern": "angular_wedge"
    },
    RoverMood.SLEEPY: {
        "title": "Low Power Slumber",
        "description": "Heavy eyelids, energy-saving standby mode.",
        "valence": 60,
        "energy": 15,
        "focus": 20,
        "auraColor": "#6366f1",  # Soft Indigo
        "eyePattern": "half_closed"
    },
    RoverMood.THINKING: {
        "title": "Neural Processing",
        "description": "Ollama LLM inference & spatial computation.",
        "valence": 70,
        "energy": 75,
        "focus": 100,
        "auraColor": "#06b6d4",  # Cyber Cyan
        "eyePattern": "scanning_sweep"
    },
    RoverMood.LISTENING: {
        "title": "Acoustic Capture",
        "description": "Microphone array active, capturing user speech.",
        "valence": 85,
        "energy": 80,
        "focus": 95,
        "auraColor": "#ec4899",  # Hot Pink
        "eyePattern": "wide_alert"
    },
    RoverMood.TALKING: {
        "title": "Speech Synthesis",
        "description": "Vocal synthesizer streaming response audio.",
        "valence": 90,
        "energy": 88,
        "focus": 85,
        "auraColor": "#10b981",  # Matrix Emerald
        "eyePattern": "expressive_mouth"
    },
    RoverMood.IDLE: {
        "title": "Ambient Standby",
        "description": "Relaxed monitoring, occasional blinking and saccades.",
        "valence": 75,
        "energy": 50,
        "focus": 60,
        "auraColor": "#8b5cf6",  # Violet Aura
        "eyePattern": "standard_capsule"
    }
}


class MoodService:
    def __init__(self):
        self.current_mood: RoverMood = RoverMood.IDLE
        self.last_change_timestamp: float = time.time()
        self.esp32_synced: bool = False
        self.last_esp32_error: Optional[str] = None
        self._auto_revert_task: Optional[asyncio.Task] = None

    def get_current_mood(self) -> Dict[str, Any]:
        """Returns the active mood state, metrics, and hardware sync telemetry."""
        meta = MOOD_METRICS.get(self.current_mood, MOOD_METRICS[RoverMood.IDLE])
        return {
            "mood": self.current_mood.value,
            "title": meta["title"],
            "description": meta["description"],
            "valence": meta["valence"],
            "energy": meta["energy"],
            "focus": meta["focus"],
            "auraColor": meta["auraColor"],
            "eyePattern": meta["eyePattern"],
            "esp32_synced": self.esp32_synced,
            "esp32_connected": rover_service.esp32_connected,
            "last_change_timestamp": self.last_change_timestamp,
            "server_time": time.time()
        }

    async def set_mood(
        self,
        mood_input: str,
        auto_revert_sec: Optional[float] = None,
        source: str = "api"
    ) -> Dict[str, Any]:
        """
        Validates mood, updates in-memory state, dispatches to ESP32 OLED,
        and broadcasts status to connected WebSockets.
        """
        # Cancel any pending auto-revert timer
        if self._auto_revert_task and not self._auto_revert_task.done():
            self._auto_revert_task.cancel()
            self._auto_revert_task = None

        normalized = mood_input.strip().upper()
        try:
            target_mood = RoverMood(normalized)
        except ValueError:
            # Fallback fuzzy match
            if "HAPPY" in normalized or "JOY" in normalized or "SMILE" in normalized:
                target_mood = RoverMood.HAPPY
            elif "EXCITE" in normalized or "HYPER" in normalized:
                target_mood = RoverMood.EXCITED
            elif "ANGRY" in normalized or "RAGE" in normalized or "FIERCE" in normalized:
                target_mood = RoverMood.ANGRY
            elif "SAD" in normalized or "CRY" in normalized:
                target_mood = RoverMood.SAD
            elif "SLEEP" in normalized or "REST" in normalized:
                target_mood = RoverMood.SLEEPY
            elif "THINK" in normalized or "CALC" in normalized:
                target_mood = RoverMood.THINKING
            elif "LISTEN" in normalized or "MIC" in normalized:
                target_mood = RoverMood.LISTENING
            elif "TALK" in normalized or "SPEAK" in normalized:
                target_mood = RoverMood.TALKING
            else:
                target_mood = RoverMood.IDLE

        self.current_mood = target_mood
        self.last_change_timestamp = time.time()
        rover_service._cached_mood = target_mood.value
        logger.info(f"[Mood Engine] Shifted mood to: {target_mood.value} (source: {source})")

        # Dispatch validated mood to physical ESP32 OLED if connected
        self.esp32_synced = False
        self.last_esp32_error = None

        if rover_service.esp32_connected:
            try:
                res = await esp32_service.client.post(
                    f"{esp32_service.base_url}/mood",
                    json={"mood": target_mood.value},
                    timeout=1.5
                )
                if res.status_code == 200:
                    self.esp32_synced = True
                else:
                    self.last_esp32_error = f"ESP32 returned HTTP {res.status_code}"
            except Exception as exc:
                self.last_esp32_error = str(exc)
                logger.warning(f"[Mood Engine] ESP32 mood dispatch warning: {exc}")

        # Broadcast update to connected frontend WebSockets
        asyncio.create_task(rover_service.broadcast_status())

        # Auto-revert timer if specified (e.g. temporary TALKING or THINKING state)
        if auto_revert_sec and auto_revert_sec > 0:
            self._auto_revert_task = asyncio.create_task(self._revert_after(auto_revert_sec, RoverMood.IDLE))

        return self.get_current_mood()

    async def _revert_after(self, delay_sec: float, revert_to: RoverMood):
        """Reverts to idle mood after temporary action completes."""
        try:
            await asyncio.sleep(delay_sec)
            logger.info(f"[Mood Engine] Auto-reverting mood to {revert_to.value} after {delay_sec}s")
            await self.set_mood(revert_to.value, source="auto_revert")
        except asyncio.CancelledError:
            pass


# Singleton instance
mood_service = MoodService()
