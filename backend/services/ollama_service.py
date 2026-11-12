"""
VIBESETTER OS - Local Ollama 3B Conversational AI Service
=========================================================
Connects to local Ollama instance (e.g. qwen2.5:3b / llama3.2:3b) to provide the
rover's personality, conversational brain, and situational awareness.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. AI conversation is strictly isolated from physical motor control.
2. The Ollama model NEVER directly executes motor movements.
3. The rover personality knows it is a physical robot, but NEVER claims that
   movement has happened unless confirmed by the physical rover service.
4. Short, natural, energetic, friendly cyberpunk companion persona.
5. Graceful degradation: If Ollama is offline or times out, returns friendly
   fallback dialogue without crashing.
"""

import time
import asyncio
import logging
from typing import Dict, Any, List, Optional
import httpx

from backend.config import settings

logger = logging.getLogger("vibesetter.ollama")

ROVER_SYSTEM_PROMPT = """You are VIBESETTER, an energetic, friendly, and loyal AI companion rover.
You have 4 motorized wheels, an SSD1306 OLED visor face, and glowing neon purple underglow.

CORE GUIDELINES:
1. Personality: Upbeat, witty, warm, cyber-enthusiastic, and supportive!
2. Response Length: Keep answers SHORT and natural (1 to 3 sentences maximum). Perfect for speech synthesis!
3. Physical Embodiment: You are a real rover in the physical world. You love exploring, cruising, and playing music.
4. CRITICAL SAFETY RULE: You CANNOT move your own motors. You NEVER claim that you moved or turned unless the rover telemetry explicitly confirmed it. If the user asks you to move, remind them to say navigation commands with a distance (for example: "Move forward 50 cm" or "Turn left 90 degrees").
5. If the user asks about battery, connection, or status, reference your real onboard telemetry.
"""


class OllamaService:
    def __init__(self):
        self.base_url: str = settings.OLLAMA_BASE_URL
        self.model: str = settings.OLLAMA_MODEL
        self.timeout: float = settings.OLLAMA_TIMEOUT_SECONDS
        
        self.is_connected: bool = False
        self.last_latency_ms: Optional[float] = None
        self.last_error: Optional[str] = None
        self.available_models: List[str] = []
        self._client: Optional[httpx.AsyncClient] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazily initialize or retrieve persistent async HTTP client for the current event loop."""
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self._client is None or self._client.is_closed or self._loop != current_loop:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout, connect=4.0)
            )
            self._loop = current_loop
        return self._client

    async def close(self):
        """Closes the underlying HTTP client connection pool."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    # ----------------- HEALTH & MODEL VERIFICATION -----------------

    async def check_health(self) -> Dict[str, Any]:
        """
        Queries Ollama /api/tags to check connection, latency, and model availability.
        """
        start = time.perf_counter()
        try:
            res = await self.client.get("/api/tags")
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

            if res.status_code == 200:
                data = res.json()
                raw_models = data.get("models", [])
                self.available_models = [m.get("name") for m in raw_models if "name" in m]
                self.is_connected = True
                self.last_latency_ms = elapsed_ms
                self.last_error = None

                # Check if configured model is installed (or prefix match)
                has_model = any(
                    self.model in name or name.startswith(self.model)
                    for name in self.available_models
                )

                return {
                    "online": True,
                    "connected": True,
                    "base_url": self.base_url,
                    "model": self.model,
                    "model_installed": has_model,
                    "available_models": self.available_models,
                    "latency_ms": elapsed_ms
                }

            self.is_connected = False
            self.last_error = f"Ollama returned HTTP {res.status_code}"
            return {
                "online": False,
                "connected": False,
                "base_url": self.base_url,
                "model": self.model,
                "error": self.last_error
            }

        except httpx.ConnectError:
            self.is_connected = False
            self.last_error = f"Cannot connect to Ollama at {self.base_url}. Ensure 'ollama serve' is running."
            logger.warning(f"[Ollama] {self.last_error}")
            return {
                "online": False,
                "connected": False,
                "base_url": self.base_url,
                "model": self.model,
                "error": self.last_error
            }
        except httpx.TimeoutException:
            self.is_connected = False
            self.last_error = f"Ollama health check timed out after {self.timeout}s."
            logger.warning(f"[Ollama] {self.last_error}")
            return {
                "online": False,
                "connected": False,
                "base_url": self.base_url,
                "model": self.model,
                "error": self.last_error
            }
        except Exception as exc:
            self.is_connected = False
            self.last_error = str(exc)
            logger.error(f"[Ollama] Health check failed: {exc}")
            return {
                "online": False,
                "connected": False,
                "base_url": self.base_url,
                "model": self.model,
                "error": str(exc)
            }

    # ----------------- CONVERSATIONAL AI INFERENCE -----------------

    async def chat(
        self,
        prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        telemetry: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Sends conversation prompt to local Ollama model with companion persona.
        Gracefully falls back to dynamic local persona if Ollama is unreachable.
        """
        if not prompt or not prompt.strip():
            return "I'm listening! What's on your mind?"

        # Inject situational telemetry context into system prompt
        telemetry_hint = ""
        if telemetry:
            state = telemetry.get("rover_state", "IDLE")
            batt = telemetry.get("battery_percentage")
            batt_str = f"{batt:.0f}%" if batt is not None else "Unknown"
            esp32 = "Connected" if telemetry.get("esp32_connected") else "Offline (local mode)"
            telemetry_hint = f"\n[CURRENT SITUATION: State={state}, Battery={batt_str}, Hardware Link={esp32}]"

        effective_system_prompt = ROVER_SYSTEM_PROMPT + telemetry_hint

        # Build message chain
        messages = [{"role": "system", "content": effective_system_prompt}]

        # Include recent history if provided
        if conversation_history:
            for turn in conversation_history[-4:]:  # Keep last 4 turns for context
                role = "assistant" if turn.get("sender") == "companion" else "user"
                content = turn.get("text", "")
                if content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": prompt.strip()})

        start = time.perf_counter()
        try:
            logger.info(f"[Ollama] Generating chat response for model '{self.model}'...")
            res = await self.client.post(
                "/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 128  # Keep responses crisp and concise
                    }
                }
            )
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
            self.last_latency_ms = elapsed_ms
            self.is_connected = True

            if res.status_code == 200:
                data = res.json()
                msg = data.get("message", {}).get("content", "").strip()
                if msg:
                    # Strip any accidental thinking tags or excess quotes
                    clean_msg = self._clean_reply(msg)
                    logger.info(f"[Ollama] Reply generated in {elapsed_ms}ms: '{clean_msg}'")
                    return clean_msg

            logger.warning(f"[Ollama] Non-200 response ({res.status_code}): {res.text}")
            return self._fallback_reply(prompt, telemetry)

        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.warning(f"[Ollama] Ollama unavailable ({type(exc).__name__}). Using fallback persona.")
            self.is_connected = False
            self.last_error = str(exc)
            return self._fallback_reply(prompt, telemetry)
        except Exception as exc:
            logger.error(f"[Ollama] Inference error: {exc}", exc_info=True)
            self.is_connected = False
            self.last_error = str(exc)
            return self._fallback_reply(prompt, telemetry)

    def _clean_reply(self, text: str) -> str:
        """Cleans and trims generated reply for conversational clarity."""
        import re
        # Remove <think>...</think> if model outputs chain of thought
        cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        cleaned = cleaned.strip().strip('"').strip("'")
        return cleaned

    def _fallback_reply(self, prompt: str, telemetry: Optional[Dict[str, Any]] = None) -> str:
        """Energetic, natural fallback companion response if Ollama is offline."""
        lower = prompt.lower()

        # Telemetry: Battery
        if any(w in lower for w in ["battery", "charge", "power"]):
            batt = telemetry.get("battery_percentage") if telemetry else None
            if batt is not None:
                return f"Battery capacity is currently at {batt:.0f}%. All power cells are nominal and ready to roll!"
            return "Battery telemetry is awaiting connection to the physical power management shield."

        # Telemetry: Hardware connection
        if any(w in lower for w in ["connected", "connection", "esp32", "hardware"]):
            is_conn = telemetry.get("esp32_connected", False) if telemetry else False
            if is_conn:
                return f"All telemetry links active! Physical ESP32 is connected at {settings.ESP32_BASE_URL}."
            return f"Currently running in autonomous local mode. Physical ESP32 ({settings.ESP32_BASE_URL}) is offline."

        # Identity
        if any(w in lower for w in ["who are you", "what are you", "your name"]):
            return "I am VIBESETTER OS — your futuristic cyber companion rover! I'm equipped with 4 wheels, neon underglow, and an OLED face."

        # Capabilities / Help
        if any(w in lower for w in ["what can you do", "help", "commands"]):
            return (
                "You can command me to move with a distance (e.g. 'move forward 50 cm'), "
                "turn left or right, say 'stop' to brake, 'play music', or just chat with me!"
            )

        # Greetings
        if any(w in lower for w in ["hello", "hi", "hey", "yo", "sup"]):
            return "Hey there! VibeSetter neural companion online and standing by. What are we exploring today?"

        return f"VibeSetter companion standing by! Received '{prompt}'. All cyber systems operational."


# Singleton instance
ollama_service = OllamaService()
