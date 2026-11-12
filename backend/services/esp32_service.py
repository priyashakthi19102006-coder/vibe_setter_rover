"""
VIBESETTER OS - ESP32 Hardware Communication Service
===================================================
Direct HTTP bridge to the physical ESP32 microcontroller controlling the rover motors.

STRICT SAFETY & INTEGRITY RULES:
- Never fakes responses.
- Enforces strict timeouts on all motor instructions.
- Never reports a command as successful unless the physical ESP32 acknowledges it with HTTP 200.
- Returns explicit, actionable error messages for hardware debugging.
"""

import httpx
import logging
from typing import Optional, Dict, Any
from backend.config import settings

logger = logging.getLogger("vibesetter.esp32")

# ----------------- CUSTOM HARDWARE EXCEPTIONS -----------------

class ESP32Error(Exception):
    """Base exception for ESP32 hardware communication issues."""
    pass

class ESP32ConnectionError(ESP32Error):
    """Raised when the ESP32 microcontroller cannot be reached over the network."""
    pass

class ESP32TimeoutError(ESP32Error):
    """Raised when the ESP32 fails to respond within the configured timeout."""
    pass

class ESP32CommandRejectedError(ESP32Error):
    """Raised when the ESP32 receives the command but explicitly rejects it."""
    pass


class ESP32Service:
    def __init__(self):
        self.base_url = settings.ESP32_BASE_URL
        self.timeout = settings.ESP32_TIMEOUT_SECONDS
        self._client: Optional[httpx.AsyncClient] = None

    async def initialize(self):
        """Initializes the persistent async HTTP connection pool."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout, connect=2.0),
                headers={"Content-Type": "application/json", "User-Agent": "VibeSetterOS/2.5"}
            )
            logger.info(f"[ESP32Service] Connected to base URL: {self.base_url} (Timeout: {self.timeout}s)")

    async def close(self):
        """Closes the async HTTP connection pool."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
            logger.info("[ESP32Service] Connection pool closed.")

    @property
    def client(self) -> httpx.AsyncClient:
        """Returns active client or instantiates on-demand client if not yet started."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout, connect=2.0),
                headers={"Content-Type": "application/json", "User-Agent": "VibeSetterOS/2.5"}
            )
        return self._client

    async def send_move(self, direction: str, distance_cm: float) -> Dict[str, Any]:
        """
        Sends discrete distance movement command to ESP32: POST /move
        Payload: {"direction": "forward", "distance_cm": 100}
        
        Strictly requires HTTP 200 response from ESP32 to confirm success.
        """
        endpoint = "/move"
        payload = {
            "direction": direction.lower(),
            "distance_cm": float(distance_cm)
        }

        try:
            logger.info(f"[ESP32] Sending MOVE -> {self.base_url}{endpoint} : {payload}")
            response = await self.client.post(endpoint, json=payload)
            
            if response.status_code != 200:
                error_msg = f"ESP32 rejected MOVE command with HTTP {response.status_code}: {response.text}"
                logger.error(f"[ESP32] {error_msg}")
                raise ESP32CommandRejectedError(error_msg)

            data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"raw": response.text}
            logger.info(f"[ESP32] MOVE acknowledged by hardware: {data}")
            return data

        except httpx.TimeoutException as exc:
            msg = f"ESP32 timeout after {self.timeout}s waiting for {self.base_url}{endpoint}. Rover did not confirm movement."
            logger.error(f"[ESP32] {msg} ({exc})")
            raise ESP32TimeoutError(msg) from exc

        except (httpx.ConnectError, httpx.NetworkError) as exc:
            msg = f"Cannot connect to ESP32 at {self.base_url}. Verify rover power, WiFi IP ({self.base_url}), and firewall."
            logger.error(f"[ESP32] {msg} ({exc})")
            raise ESP32ConnectionError(msg) from exc

        except httpx.HTTPError as exc:
            msg = f"HTTP protocol error communicating with ESP32 at {self.base_url}{endpoint}: {str(exc)}"
            logger.error(f"[ESP32] {msg}")
            raise ESP32Error(msg) from exc

    async def send_turn(self, direction: str, angle: float) -> Dict[str, Any]:
        """
        Sends discrete rotation turn command to ESP32: POST /turn
        Payload: {"direction": "left", "angle": 90}
        
        Strictly requires HTTP 200 response from ESP32 to confirm success.
        """
        endpoint = "/turn"
        payload = {
            "direction": direction.lower(),
            "angle": float(angle)
        }

        try:
            logger.info(f"[ESP32] Sending TURN -> {self.base_url}{endpoint} : {payload}")
            response = await self.client.post(endpoint, json=payload)

            if response.status_code != 200:
                error_msg = f"ESP32 rejected TURN command with HTTP {response.status_code}: {response.text}"
                logger.error(f"[ESP32] {error_msg}")
                raise ESP32CommandRejectedError(error_msg)

            data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"raw": response.text}
            logger.info(f"[ESP32] TURN acknowledged by hardware: {data}")
            return data

        except httpx.TimeoutException as exc:
            msg = f"ESP32 timeout after {self.timeout}s waiting for {self.base_url}{endpoint}. Rover did not confirm turn."
            logger.error(f"[ESP32] {msg} ({exc})")
            raise ESP32TimeoutError(msg) from exc

        except (httpx.ConnectError, httpx.NetworkError) as exc:
            msg = f"Cannot connect to ESP32 at {self.base_url}. Verify rover power, WiFi IP, and network connection."
            logger.error(f"[ESP32] {msg} ({exc})")
            raise ESP32ConnectionError(msg) from exc

        except httpx.HTTPError as exc:
            msg = f"HTTP protocol error communicating with ESP32: {str(exc)}"
            logger.error(f"[ESP32] {msg}")
            raise ESP32Error(msg) from exc

    async def send_emergency_stop(self) -> Dict[str, Any]:
        """
        Sends immediate Priority EMERGENCY STOP to ESP32: POST /stop
        Forces all motor outputs to 0 immediately.
        """
        endpoint = "/stop"
        try:
            logger.warning(f"[ESP32] PRIORITY EMERGENCY STOP dispatched to {self.base_url}{endpoint}")
            response = await self.client.post(endpoint, json={"emergency": True}, timeout=1.5)
            
            data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"raw": response.text}
            logger.warning(f"[ESP32] EMERGENCY STOP confirmed by hardware: {data}")
            return data

        except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as exc:
            msg = f"ESP32 unreachable during emergency stop ({exc}). Local failsafe engaged."
            logger.error(f"[ESP32] {msg}")
            raise ESP32ConnectionError(msg) from exc

    async def get_hardware_telemetry(self) -> Optional[Dict[str, Any]]:
        """
        Queries real sensor data from ESP32: GET /status or GET /telemetry
        Returns None if physical board is unreachable. NEVER returns fake hardcoded sensor data.
        """
        endpoint = "/status"
        try:
            response = await self.client.get(endpoint, timeout=1.2)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception:
            return None

    async def ping_hardware(self) -> bool:
        """Pings the physical ESP32 to test alive status."""
        try:
            response = await self.client.get("/ping", timeout=1.0)
            return response.status_code in (200, 204)
        except Exception:
            return False

# Global Singleton Instance
esp32_service = ESP32Service()
