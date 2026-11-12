"""
VIBESETTER OS - Music & Lyrics Service
======================================
Manages royalty-free music library, audio synthesis, playback state,
timestamped LRC lyrics synchronization, and rover mood trigger integration.

LEGAL & MODULAR:
- Uses 100% royalty-free, procedurally synthesized cyberpunk audio files.
- Zero copyrighted scraping or illegal downloads.
- Supports local user-supplied WAV/MP3 files dropped into backend/static/audio/.
"""

import os
import time
import math
import wave
import struct
import logging
from typing import List, Dict, Any, Optional
from backend.services.mood_service import mood_service

logger = logging.getLogger("vibesetter.music")

AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "audio")

# ----------------- 1. ROYALTY-FREE MUSIC CATALOG & LRC LYRICS -----------------

DEFAULT_LIBRARY: List[Dict[str, Any]] = [
    {
        "id": "track-01",
        "title": "Neon Odyssey (VibeSetter Mix)",
        "artist": "Cybernetic Echoes",
        "album": "Cyberpunk Companion Vol. 1",
        "duration_sec": 34.0,
        "bpm": 128,
        "genre": "Synthwave",
        "mood_tag": "Euphoric",
        "scale": [220.0, 261.63, 329.63, 392.00, 349.23, 293.66, 329.63, 261.63], # Am arpeggio
        "style": "synthwave",
        "lyrics": [
            {"time": 0.0, "text": "♪ [Synth Arpeggiator Initialization] ♪"},
            {"time": 4.0, "text": "Neon grids pulsing in the midnight rain"},
            {"time": 8.5, "text": "Neural signals routing through the data lane"},
            {"time": 13.0, "text": "VibeSetter Rover scans the horizon clear"},
            {"time": 17.5, "text": "Companion core whispers into the atmosphere"},
            {"time": 22.0, "text": "Bassline drops, quantum frequencies align"},
            {"time": 26.5, "text": "Synchronized rhythm across space and time"},
            {"time": 30.5, "text": "♪ [Synthesizer Outro Fade] ♪"}
        ]
    },
    {
        "id": "track-02",
        "title": "Midnight Velocity",
        "artist": "Hyperion Drive",
        "album": "Velocity Protocol",
        "duration_sec": 28.0,
        "bpm": 134,
        "genre": "Darksynth",
        "mood_tag": "Adrenaline",
        "scale": [164.81, 196.00, 220.00, 246.94, 293.66, 246.94, 196.00, 164.81], # Em drive
        "style": "darksynth",
        "lyrics": [
            {"time": 0.0, "text": "♪ [High-Speed Motor Whir & Kick] ♪"},
            {"time": 3.5, "text": "Overclock the engines, full torque on all four wheels"},
            {"time": 7.5, "text": "Tires grip the asphalt, cutting through magnetic fields"},
            {"time": 12.0, "text": "Sensor matrix locks onto the navigation route"},
            {"time": 16.5, "text": "Push beyond the limit, leaving all the doubts"},
            {"time": 21.0, "text": "Velocity is climbing, cyberpunk horizon glows"},
            {"time": 25.0, "text": "♪ [Sub-bass pulse and engine sweep] ♪"}
        ]
    },
    {
        "id": "track-03",
        "title": "Bioluminescent Dreams",
        "artist": "Astral Rover",
        "album": "Starlight Memory",
        "duration_sec": 32.0,
        "bpm": 92,
        "genre": "Ambient Chill",
        "mood_tag": "Calm",
        "scale": [146.83, 220.00, 293.66, 369.99, 440.00, 369.99, 293.66, 220.00], # Dmaj7 ambient
        "style": "ambient",
        "lyrics": [
            {"time": 0.0, "text": "♪ [Bioluminescent Chime Waves] ♪"},
            {"time": 4.0, "text": "Floating under neon constellations in the dark"},
            {"time": 9.0, "text": "Every battery cell recharges from an astral spark"},
            {"time": 14.5, "text": "Gentle servo hums beneath the calm electric skies"},
            {"time": 20.0, "text": "Peaceful reflections inside glowing robot eyes"},
            {"time": 25.5, "text": "Resting on the charging dock until the morning sun"},
            {"time": 29.5, "text": "♪ [Soft Harmonic Resonance] ♪"}
        ]
    },
    {
        "id": "track-04",
        "title": "Sub-Zero Glitch (Instrumental)",
        "artist": "Glitch Runner",
        "album": "Silicon Anomalies",
        "duration_sec": 24.0,
        "bpm": 140,
        "genre": "Chiptune / Cyber",
        "mood_tag": "Cyber",
        "scale": [261.63, 311.13, 392.00, 466.16, 523.25, 466.16, 392.00, 311.13], # Cm glitch
        "style": "chiptune",
        "lyrics": []  # Intentionally empty to test graceful missing lyrics handling
    }
]


# ----------------- 2. FAST PROCEDURAL AUDIO GENERATOR -----------------

def ensure_audio_file(track: Dict[str, Any]) -> str:
    """
    Generates a royalty-free WAV file procedurally if not already cached.
    Uses 100% standard library wave and math. Zero external dependencies.
    """
    os.makedirs(AUDIO_DIR, exist_ok=True)
    filename = f"{track['id']}.wav"
    filepath = os.path.join(AUDIO_DIR, filename)

    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        return filepath

    logger.info(f"[Music Engine] Synthesizing royalty-free audio for '{track['title']}'...")
    sample_rate = 22050
    duration = float(track.get("duration_sec", 30.0))
    bpm = float(track.get("bpm", 128))
    scale = track.get("scale", [220.0, 261.6, 329.6, 392.0])
    n_samples = int(sample_rate * duration)
    beat_sec = 60.0 / bpm
    buf = bytearray(n_samples * 2)

    for i in range(n_samples):
        t = i / sample_rate
        beat_idx = int(t / (beat_sec / 2)) % len(scale)
        freq = scale[beat_idx]

        # Note envelope
        note_phase = (t % (beat_sec / 2)) / (beat_sec / 2)
        env = math.exp(-3.2 * note_phase)

        # Harmonics
        v1 = math.sin(2 * math.pi * freq * t)
        v2 = 0.4 * math.sin(4 * math.pi * freq * t)
        v3 = 0.2 * math.sin(6 * math.pi * freq * t)
        v_sub = 0.55 * math.sin(2 * math.pi * (freq * 0.5) * t)

        # Drum kick on whole beats
        kick = 0.0
        if (t % beat_sec) < 0.12:
            k_t = (t % beat_sec) / 0.12
            kick = math.sin(2 * math.pi * (150 * (1 - k_t) + 40) * (t % beat_sec)) * (1 - k_t) * 0.75

        # Hi-hat tick on eighth notes
        hat = 0.0
        if (t % (beat_sec / 2)) < 0.03:
            hat = (math.sin(2 * math.pi * 3500 * t) * 0.2)

        sample_val = ((v1 + v2 + v3 + v_sub) * env * 0.42 + kick * 0.5 + hat)
        sample = int(max(min(sample_val, 1.0), -1.0) * 32000)
        struct.pack_into("<h", buf, i * 2, sample)

    with wave.open(filepath, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.writeframes(buf)

    logger.info(f"[Music Engine] Synthesized {filepath} ({os.path.getsize(filepath)} bytes)")
    return filepath


# ----------------- 3. MUSIC SERVICE CONTROLLER -----------------

class MusicService:
    def __init__(self):
        self.library = DEFAULT_LIBRARY
        self.current_song_id: str = "track-01"
        self.is_playing: bool = False
        self.playback_start_timestamp: float = time.time()
        self.paused_progress_sec: float = 0.0
        self.volume: int = 75
        self.bass_boost: bool = True
        self.reactive_leds: bool = True
        self.hardware_speaker_synced: bool = False  # Strictly false unless ESP32 DAC acknowledges
        self.rover_mood_triggered: str = "IDLE"

        # Pre-cache procedural audio files
        for track in self.library:
            try:
                ensure_audio_file(track)
            except Exception as e:
                logger.warning(f"[Music Engine] Audio synthesis warning for {track['id']}: {e}")

    def get_library(self) -> List[Dict[str, Any]]:
        """Returns the full music catalog with metadata and stream URLs."""
        return [
            {
                "id": t["id"],
                "title": t["title"],
                "artist": t["artist"],
                "album": t["album"],
                "duration_sec": t["duration_sec"],
                "bpm": t["bpm"],
                "genre": t["genre"],
                "mood_tag": t["mood_tag"],
                "audio_url": f"/api/music/stream/{t['id']}",
                "has_lyrics": len(t.get("lyrics", [])) > 0,
                "lyrics_count": len(t.get("lyrics", []))
            }
            for t in self.library
        ]

    def get_song(self, song_id: str) -> Optional[Dict[str, Any]]:
        """Fetch song by ID including timestamped lyrics."""
        for t in self.library:
            if t["id"] == song_id:
                return {
                    "id": t["id"],
                    "title": t["title"],
                    "artist": t["artist"],
                    "album": t["album"],
                    "duration_sec": t["duration_sec"],
                    "bpm": t["bpm"],
                    "genre": t["genre"],
                    "mood_tag": t["mood_tag"],
                    "audio_url": f"/api/music/stream/{t['id']}",
                    "lyrics": t.get("lyrics", [])
                }
        return None

    def get_lyrics(self, song_id: str) -> List[Dict[str, Any]]:
        """Returns LRC-style timestamped lyrics array: [{'time': 12.5, 'text': '...'}]"""
        song = self.get_song(song_id)
        if song:
            return song.get("lyrics", [])
        return []

    def get_audio_path(self, song_id: str) -> Optional[str]:
        """Returns the filesystem path to the audio WAV file."""
        song = self.get_song(song_id)
        if not song:
            return None
        return ensure_audio_file(song)

    async def play(self, song_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Starts or resumes music playback.
        Triggers rover OLED eyes expression: EXCITED.
        """
        if song_id and song_id != self.current_song_id:
            self.current_song_id = song_id
            self.paused_progress_sec = 0.0

        self.is_playing = True
        self.playback_start_timestamp = time.time() - self.paused_progress_sec
        self.rover_mood_triggered = "EXCITED"

        # Trigger rover OLED eye expression
        try:
            await mood_service.set_mood("EXCITED", source="music_play")
        except Exception as e:
            logger.warning(f"[Music Engine] Could not trigger mood EXCITED: {e}")

        logger.info(f"[Music Engine] Playback started: {self.current_song_id} (Mood: EXCITED)")
        return self.get_status()

    async def pause(self) -> Dict[str, Any]:
        """
        Pauses music playback and records current position.
        Triggers rover OLED eyes expression: HAPPY.
        """
        if self.is_playing:
            current_song = self.get_song(self.current_song_id)
            duration = current_song["duration_sec"] if current_song else 30.0
            elapsed = (time.time() - self.playback_start_timestamp) % duration
            self.paused_progress_sec = elapsed
            self.is_playing = False

        self.rover_mood_triggered = "HAPPY"
        try:
            await mood_service.set_mood("HAPPY", auto_revert_sec=5.0, source="music_pause")
        except Exception as e:
            logger.warning(f"[Music Engine] Could not trigger mood HAPPY: {e}")

        logger.info(f"[Music Engine] Playback paused at {self.paused_progress_sec:.1f}s")
        return self.get_status()

    async def stop(self) -> Dict[str, Any]:
        """
        Stops music playback and resets position.
        Triggers rover OLED eyes expression: IDLE.
        """
        self.is_playing = False
        self.paused_progress_sec = 0.0
        self.playback_start_timestamp = time.time()
        self.rover_mood_triggered = "IDLE"

        try:
            await mood_service.set_mood("IDLE", source="music_stop")
        except Exception as e:
            logger.warning(f"[Music Engine] Could not trigger mood IDLE: {e}")

        logger.info("[Music Engine] Playback stopped. Position reset.")
        return self.get_status()

    def set_volume(self, volume: int) -> int:
        """Sets playback volume (0 - 100)."""
        self.volume = max(0, min(100, volume))
        return self.volume

    def get_status(self) -> Dict[str, Any]:
        """Returns comprehensive real-time music playback and lyrics status."""
        current_song = self.get_song(self.current_song_id)
        if not current_song:
            current_song = self.library[0]
            self.current_song_id = current_song["id"]

        duration = current_song.get("duration_sec", 30.0)
        if self.is_playing:
            progress = (time.time() - self.playback_start_timestamp) % duration
        else:
            progress = self.paused_progress_sec % duration

        return {
            "status": "success",
            "is_playing": self.is_playing,
            "current_song": current_song,
            "progress_sec": round(progress, 2),
            "duration_sec": duration,
            "volume": self.volume,
            "bass_boost": self.bass_boost,
            "reactive_leds": self.reactive_leds,
            "hardware_speaker_synced": self.hardware_speaker_synced,
            "playback_target": "BROWSER_STREAM",
            "rover_mood_triggered": self.rover_mood_triggered,
            "server_timestamp": time.time()
        }


# Global singleton instance
music_service = MusicService()

