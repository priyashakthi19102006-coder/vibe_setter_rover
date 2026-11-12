"""
VIBESETTER OS - Backend Configuration
====================================
Environment-driven configuration for server, safety thresholds, and ESP32 physical communication.
"""

from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PATH = Path(__file__).parent / ".env"

class Settings(BaseSettings):
    APP_NAME: str = "VIBESETTER OS Rover Backend"
    APP_VERSION: str = "2.5.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS configuration
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]

    # ESP32 Microcontroller Communication
    ESP32_BASE_URL: str = "http://192.168.4.1"
    ESP32_TIMEOUT_SECONDS: float = 3.0

    # Safety Thresholds
    MIN_DISTANCE_CM: float = 1.0
    MAX_DISTANCE_CM: float = 500.0
    MAX_ROTATION_ANGLE: float = 360.0

    # WebSocket Status Update Interval
    STATUS_POLL_INTERVAL_SECONDS: float = 1.0

    # Local Ollama AI Model Configuration
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    OLLAMA_TIMEOUT_SECONDS: float = 15.0

    # Text-To-Speech (TTS) Configuration
    TTS_ENGINE: str = "pyttsx3"
    TTS_AUDIO_DIR: str = "backend/static/audio"
    TTS_VOICE_RATE: int = 175
    TTS_VOICE_VOLUME: float = 1.0

    @field_validator("OLLAMA_BASE_URL", mode="after")
    def clean_ollama_url(cls, v: str) -> str:
        url = v.strip().rstrip("/")
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"http://{url}"
        return url

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("ESP32_BASE_URL", mode="after")
    def clean_esp32_url(cls, v: str) -> str:
        url = v.strip().rstrip("/")
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"http://{url}"
        return url

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

