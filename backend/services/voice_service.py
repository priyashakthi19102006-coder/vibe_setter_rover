"""
VIBESETTER OS - Voice AI Intent & Command Safety Pipeline
=========================================================
Implements the multi-stage Voice Pipeline:
Microphone / Audio / Transcription
  -> Intent Classification
  -> Structured Command Extraction (direction, distance, angle)
  -> Safety & Completeness Validation (Mandatory distance clarification)
  -> Hardware Synchronization & Response Generation

CRITICAL SAFETY PRINCIPLES:
1. Movement commands MUST NOT execute based on raw, unvalidated AI output.
2. If distance is missing on movement commands, the system MUST ask the user
   for clarification rather than guessing.
3. Angle must be validated for turns.
4. Physical movement only occurs if validated and ESP32 hardware acknowledges.
5. Emergency STOP is prioritized and immediately available.
"""

import re
import time
import base64
import logging
from typing import Dict, Any, Optional, Tuple
from fastapi import HTTPException

from backend.config import settings
from backend.models.schemas import (
    MoveDirection,
    TurnDirection,
    VoiceProcessRequest,
    VoiceProcessResponse
)
from backend.services.rover_service import rover_service
from backend.services.ollama_service import ollama_service
from backend.services.tts_service import tts_service
from backend.services.mood_service import mood_service

logger = logging.getLogger("vibesetter.voice")

# Number word dictionary for speech-to-text conversions
NUMBER_WORDS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "twenty-five": 25, "twenty five": 25,
    "thirty": 30, "thirty-five": 35, "thirty five": 35,
    "forty": 40, "forty-five": 45, "forty five": 45,
    "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
    "hundred": 100, "one hundred": 100, "two hundred": 200, "three hundred": 300,
    "one-eighty": 180, "one eighty": 180, "three-sixty": 360, "three sixty": 360
}


class VoiceService:
    def __init__(self):
        # Conversational session context for tracking pending clarification requests
        # Structure: { session_id: { "pending_intent": str, "direction": str, "timestamp": float } }
        self._pending_clarifications: Dict[str, Dict[str, Any]] = {}

    def _clear_pending(self, session_id: str):
        if session_id in self._pending_clarifications:
            del self._pending_clarifications[session_id]

    def _get_pending(self, session_id: str) -> Optional[Dict[str, Any]]:
        data = self._pending_clarifications.get(session_id)
        if not data:
            return None
        # Expire pending state after 60 seconds of inactivity
        if time.time() - data.get("timestamp", 0) > 60.0:
            self._clear_pending(session_id)
            return None
        return data

    def _set_pending(self, session_id: str, data: Dict[str, Any]):
        data["timestamp"] = time.time()
        self._pending_clarifications[session_id] = data

    async def _build_response(
        self,
        transcript: str,
        intent: str,
        action: str,
        response: str,
        needs_clarification: bool = False,
        clarification_prompt: Optional[str] = None,
        command_payload: Optional[Dict[str, Any]] = None,
        executed: bool = False,
        execution_result: Optional[Dict[str, Any]] = None,
        rover_state: Optional[str] = None
    ) -> VoiceProcessResponse:
        """
        Synthesizes TTS speech audio URL and packages structured VoiceProcessResponse.
        """
        audio_url = None
        if response and response.strip():
            try:
                tts_info = await tts_service.synthesize(response)
                if tts_info.get("success"):
                    audio_url = tts_info.get("audio_url")
            except Exception as e:
                logger.warning(f"[Voice] Speech synthesis skipped: {e}")

        return VoiceProcessResponse(
            transcript=transcript,
            intent=intent,
            action=action,
            response=response,
            needs_clarification=needs_clarification,
            clarification_prompt=clarification_prompt,
            command_payload=command_payload,
            executed=executed,
            execution_result=execution_result,
            rover_state=rover_state or rover_service.state.value,
            audio_url=audio_url,
            timestamp=time.time()
        )

    # -------------------------------------------------------------
    # STAGE 1: TRANSCRIPTION & TEXT NORMALIZATION
    # -------------------------------------------------------------

    def normalize_input(self, text: str) -> str:
        """Cleans and standardizes punctuation and casing for rule matching."""
        if not text:
            return ""
        cleaned = text.strip().lower()
        # Remove trailing periods, question marks, exclamation marks
        cleaned = re.sub(r"[?!.,;]+$", "", cleaned)
        return cleaned

    def parse_number_expression(self, text: str) -> Optional[float]:
        """Extracts numeric value from digits or written number words."""
        # Check standard digits
        digit_match = re.search(r"(\d+(?:\.\d+)?)", text)
        if digit_match:
            try:
                return float(digit_match.group(1))
            except ValueError:
                pass

        # Check fraction phrases
        if "half a" in text or "half" in text:
            return 0.5
        if "quarter" in text:
            return 0.25

        # Check word mappings
        for word, val in NUMBER_WORDS.items():
            if re.search(rf"\b{re.escape(word)}\b", text):
                return float(val)

        return None

    def extract_distance_cm(self, text: str) -> Optional[float]:
        """
        Extracts distance in centimeters from spoken speech.
        Handles: '10 cm', '25 centimeters', '1 meter', '1.5 m', 'half a meter', '50cm'.
        Returns distance in centimeters (float) or None if missing.
        """
        # Case 1: Meters explicit (e.g. "1 meter", "2.5 m", "half a meter")
        meter_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:m|meter|meters|metre|metres)\b", text)
        if meter_match:
            return round(float(meter_match.group(1)) * 100.0, 2)

        if "half a meter" in text or "half meter" in text:
            return 50.0
        if "quarter meter" in text or "quarter of a meter" in text:
            return 25.0

        meter_words = {
            "one meter": 100.0, "two meters": 200.0, "three meters": 300.0,
            "1 meter": 100.0, "2 meters": 200.0, "a meter": 100.0
        }
        for mw, cm in meter_words.items():
            if mw in text:
                return cm

        # Case 2: Centimeters explicit (e.g. "50 cm", "25 centimeters", "10cm")
        cm_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:cm|centimeter|centimeters|centimetre|centimetres)\b", text)
        if cm_match:
            return round(float(cm_match.group(1)), 2)

        # Word-based cm (e.g. "ten cm", "twenty five centimeters", "fifty centimeters")
        for word, val in NUMBER_WORDS.items():
            if re.search(rf"\b{re.escape(word)}\s*(?:cm|centimeter|centimeters)\b", text):
                return float(val)

        # Case 3: Naked number when clarification is being answered
        # e.g., prompt was "How far?" and user replies "50" or "twenty five"
        return None

    def extract_angle_degrees(self, text: str) -> Optional[float]:
        """
        Extracts rotation angle in degrees from spoken speech.
        Handles: '90 degrees', '45 deg', '180°', 'quarter turn', 'u-turn'.
        Returns angle in degrees (float) or None if missing.
        """
        # Case 1: Degree units explicit
        deg_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|°)\b", text)
        if deg_match:
            return round(float(deg_match.group(1)), 2)

        # Word-based degrees
        for word, val in NUMBER_WORDS.items():
            if re.search(rf"\b{re.escape(word)}\s*(?:deg|degree|degrees|°)\b", text):
                return float(val)

        # Shorthand phrases
        if "u-turn" in text or "u turn" in text or "turn around" in text:
            return 180.0
        if "full circle" in text or "360" in text:
            return 360.0
        if "quarter turn" in text:
            return 90.0

        return None

    # -------------------------------------------------------------
    # STAGE 2: INTENT CLASSIFICATION & INTENT ROUTING
    # -------------------------------------------------------------

    def classify_intent(self, text: str, pending: Optional[Dict[str, Any]]) -> Tuple[str, Dict[str, Any]]:
        """
        Classifies incoming text into structured intent and parameters.
        Returns (intent, params).
        """
        text = self.normalize_input(text)

        # 1. EMERGENCY STOP (Highest priority)
        if any(w in text for w in [
            "stop", "halt", "freeze", "brake", "emergency stop", "cut motor", "kill motors", "shut down"
        ]):
            return "EMERGENCY_STOP", {}

        # 2. PENDING CLARIFICATION RESOLUTION
        # If rover was waiting for distance or angle for a previous command
        if pending:
            pending_intent = pending.get("pending_intent")

            # Resolving pending MOVE distance
            if pending_intent in ["MOVE_FORWARD", "MOVE_BACKWARD", "MOVE_LEFT", "MOVE_RIGHT"]:
                # Try explicit distance or naked number
                dist = self.extract_distance_cm(text)
                if dist is None:
                    naked_num = self.parse_number_expression(text)
                    if naked_num is not None:
                        # If user simply spoke "50" or "twenty five", assume cm
                        dist = naked_num
                if dist is not None:
                    return pending_intent, {
                        "direction": pending.get("direction"),
                        "distance_cm": dist,
                        "clarification_answered": True
                    }

            # Resolving pending TURN angle
            if pending_intent in ["TURN_LEFT", "TURN_RIGHT"]:
                angle = self.extract_angle_degrees(text)
                if angle is None:
                    naked_num = self.parse_number_expression(text)
                    if naked_num is not None:
                        angle = naked_num
                if angle is not None:
                    return pending_intent, {
                        "direction": pending.get("direction"),
                        "angle": angle,
                        "clarification_answered": True
                    }

        # 3. TURNING / ROTATION COMMANDS
        # Words: "turn left", "rotate right", "spin left", "pivot right"
        is_turn = any(k in text for k in ["turn", "rotate", "spin", "pivot"])
        has_left = "left" in text or "counter-clockwise" in text or "counterclockwise" in text
        has_right = "right" in text or "clockwise" in text

        if is_turn:
            angle = self.extract_angle_degrees(text)
            if has_left:
                return "TURN_LEFT", {"direction": "left", "angle": angle}
            elif has_right:
                return "TURN_RIGHT", {"direction": "right", "angle": angle}
            else:
                # Ambiguous direction
                return "TURN_AMBIGUOUS", {}

        # 4. DISCRETE MOVEMENT COMMANDS
        # Direction indicators
        is_forward = any(k in text for k in ["forward", "ahead", "straight", "front", "go forward", "move forward", "drive forward"])
        is_backward = any(k in text for k in ["backward", "back", "reverse", "retreat", "go back", "move back", "drive back"])
        is_strafe_left = any(k in text for k in ["move left", "strafe left", "slide left", "drive left", "step left"])
        is_strafe_right = any(k in text for k in ["move right", "strafe right", "slide right", "drive right", "step right"])

        if is_forward:
            dist = self.extract_distance_cm(text)
            return "MOVE_FORWARD", {"direction": "forward", "distance_cm": dist}

        if is_backward:
            dist = self.extract_distance_cm(text)
            return "MOVE_BACKWARD", {"direction": "backward", "distance_cm": dist}

        if is_strafe_left:
            dist = self.extract_distance_cm(text)
            return "MOVE_LEFT", {"direction": "left", "distance_cm": dist}

        if is_strafe_right:
            dist = self.extract_distance_cm(text)
            return "MOVE_RIGHT", {"direction": "right", "distance_cm": dist}

        # Check turn if user simply said "left 90 degrees" or "right 45" without saying "turn"
        if has_left and any(k in text for k in ["deg", "degree", "°"]):
            angle = self.extract_angle_degrees(text)
            return "TURN_LEFT", {"direction": "left", "angle": angle}
        if has_right and any(k in text for k in ["deg", "degree", "°"]):
            angle = self.extract_angle_degrees(text)
            return "TURN_RIGHT", {"direction": "right", "angle": angle}

        # 5. MUSIC COMMANDS
        if any(k in text for k in ["play music", "start music", "play song", "play track", "play some music", "resume music"]):
            return "PLAY_MUSIC", {}
        if any(k in text for k in ["stop music", "pause music", "mute music", "stop song", "turn off music", "shut off music"]):
            return "STOP_MUSIC", {}

        # 6. EXPRESSION COMMANDS
        if any(k in text for k in ["expression", "face", "look", "mood", "smile"]):
            # Extract desired expression name
            expr_name = "happy"
            if any(w in text for w in ["happy", "smile", "joy", "laugh", "cheerful"]):
                expr_name = "happy"
            elif any(w in text for w in ["angry", "rage", "furious", "mad", "combat"]):
                expr_name = "angry"
            elif any(w in text for w in ["sad", "cry", "down", "sorrow"]):
                expr_name = "sad"
            elif any(w in text for w in ["cyber", "vibe", "futuristic", "neon", "cool"]):
                expr_name = "cyber"
            elif any(w in text for w in ["surprised", "shocked", "wow", "wide"]):
                expr_name = "surprised"
            elif any(w in text for w in ["wink", "flirt", "playful"]):
                expr_name = "wink"
            elif any(w in text for w in ["neutral", "calm", "zen", "idle", "default"]):
                expr_name = "neutral"
            return "CHANGE_EXPRESSION", {"expression": expr_name}

        # 7. GENERAL CONVERSATION & ROVER TELEMETRY QUERIES
        return "GENERAL_CONVERSATION", {}

    # -------------------------------------------------------------
    # STAGE 3 & 4: STRUCTURED VALIDATION, SAFETY & EXECUTION
    # -------------------------------------------------------------

    async def process_voice_input(self, req: VoiceProcessRequest) -> VoiceProcessResponse:
        """
        Coordinates the full voice command safety pipeline:
        Speech/Text -> Intent -> Structured Validation -> Safety Check -> Rover Execution.
        """
        session_id = req.session_id or "default"
        raw_text = req.transcript or req.text or ""

        # Handle base64 audio if provided without text
        if not raw_text.strip() and req.audio_base64:
            logger.info(f"[Voice] Received base64 audio ({len(req.audio_base64)} chars) for session '{session_id}'")
            # In web applications, speech recognition is conducted by the browser SpeechRecognition API.
            # If server receives pure audio, note that audio was received.
            raw_text = "Audio stream received"

        if not raw_text.strip():
            return await self._build_response(
                transcript="",
                intent="EMPTY_INPUT",
                action="AWAIT_SPEECH",
                response="Microphone stream received, but no speech was detected. Please try speaking again.",
                needs_clarification=False
            )

        logger.info(f"[Voice Pipeline] Session '{session_id}' | Raw Transcript: '{raw_text}'")

        # Check pending session state
        pending = self._get_pending(session_id)

        # 1. Intent Classification
        intent, params = self.classify_intent(raw_text, pending)
        logger.info(f"[Voice Pipeline] Classified Intent: {intent} | Params: {params}")

        # ----------------- CASE A: EMERGENCY STOP -----------------
        if intent == "EMERGENCY_STOP":
            self._clear_pending(session_id)
            stop_res = await rover_service.emergency_stop()
            await mood_service.set_mood("ANGRY", auto_revert_sec=5.0)
            return await self._build_response(
                transcript=raw_text,
                intent="EMERGENCY_STOP",
                action="EXECUTE_STOP",
                response="Emergency STOP triggered! All motor channels cut immediately.",
                needs_clarification=False,
                executed=True,
                execution_result=stop_res.model_dump(),
                rover_state="STOPPED"
            )

        # ----------------- CASE B: MOVEMENT COMMANDS -----------------
        if intent in ["MOVE_FORWARD", "MOVE_BACKWARD", "MOVE_LEFT", "MOVE_RIGHT"]:
            direction_str = params.get("direction", "forward")
            distance_cm = params.get("distance_cm")

            # SAFETY REQUIREMENT: If distance is missing, ask for clarification!
            if distance_cm is None:
                # Save pending state for next response
                self._set_pending(session_id, {
                    "pending_intent": intent,
                    "direction": direction_str
                })

                clarification_msg = (
                    f"How far would you like me to move {direction_str}? "
                    "Please specify a distance, like 10 cm, 25 cm, 50 cm, or 1 meter."
                )

                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="REQUEST_CLARIFICATION",
                    response=clarification_msg,
                    needs_clarification=True,
                    clarification_prompt=clarification_msg,
                    command_payload={"direction": direction_str, "distance_cm": None},
                    executed=False,
                    rover_state=rover_service.state.value
                )

            # SAFETY VALIDATION: Validate distance range
            if distance_cm < settings.MIN_DISTANCE_CM:
                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="SAFETY_REJECTION",
                    response=f"Requested distance {distance_cm} cm is too small. Minimum safe distance is {settings.MIN_DISTANCE_CM} cm.",
                    needs_clarification=False,
                    executed=False,
                    rover_state=rover_service.state.value
                )

            if distance_cm > settings.MAX_DISTANCE_CM:
                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="SAFETY_REJECTION",
                    response=f"Requested distance {distance_cm} cm exceeds maximum safety threshold of {settings.MAX_DISTANCE_CM} cm (5 meters). Please specify a shorter distance.",
                    needs_clarification=False,
                    executed=False,
                    rover_state=rover_service.state.value
                )

            # Dispatched with full validation
            self._clear_pending(session_id)
            dir_enum = MoveDirection(direction_str)

            try:
                move_res = await rover_service.move(dir_enum, distance_cm)
                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="EXECUTE_MOVE",
                    response=f"Executing {direction_str} movement for {distance_cm} cm. Motors engaged.",
                    needs_clarification=False,
                    command_payload={"direction": direction_str, "distance_cm": distance_cm},
                    executed=True,
                    execution_result=move_res.model_dump(),
                    rover_state=rover_service.state.value
                )
            except HTTPException as exc:
                # Hardware disconnected or rejected; safety guarantee: never fake motion
                logger.warning(f"[Voice] Physical rover execution blocked: {exc.detail}")
                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="EXECUTION_BLOCKED_OFFLINE",
                    response=f"Command validated for {distance_cm} cm {direction_str}, but the physical rover is currently offline (ESP32 unreachable). Motion was not sent to hardware.",
                    needs_clarification=False,
                    command_payload={"direction": direction_str, "distance_cm": distance_cm},
                    executed=False,
                    execution_result={"error": exc.detail, "status_code": exc.status_code},
                    rover_state=rover_service.state.value
                )

        # ----------------- CASE C: TURNING COMMANDS -----------------
        if intent in ["TURN_LEFT", "TURN_RIGHT"]:
            direction_str = params.get("direction", "left")
            angle_deg = params.get("angle")

            if angle_deg is None:
                # Request angle clarification
                self._set_pending(session_id, {
                    "pending_intent": intent,
                    "direction": direction_str
                })
                clarification_msg = (
                    f"By how many degrees should I turn {direction_str}? "
                    "For example: 45 degrees, 90 degrees, or 180 degrees."
                )
                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="REQUEST_CLARIFICATION",
                    response=clarification_msg,
                    needs_clarification=True,
                    clarification_prompt=clarification_msg,
                    command_payload={"direction": direction_str, "angle": None},
                    executed=False,
                    rover_state=rover_service.state.value
                )

            # SAFETY VALIDATION: Check angle boundaries
            if angle_deg <= 0 or angle_deg > settings.MAX_ROTATION_ANGLE:
                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="SAFETY_REJECTION",
                    response=f"Turn angle {angle_deg}° is invalid. Must be between 1° and {settings.MAX_ROTATION_ANGLE}°.",
                    needs_clarification=False,
                    executed=False,
                    rover_state=rover_service.state.value
                )

            self._clear_pending(session_id)
            dir_enum = TurnDirection(direction_str)

            try:
                turn_res = await rover_service.turn(dir_enum, angle_deg)
                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="EXECUTE_TURN",
                    response=f"Turning {direction_str} by {angle_deg} degrees. Gyroscope tracking active.",
                    needs_clarification=False,
                    command_payload={"direction": direction_str, "angle": angle_deg},
                    executed=True,
                    execution_result=turn_res.model_dump(),
                    rover_state=rover_service.state.value
                )
            except HTTPException as exc:
                logger.warning(f"[Voice] Turn blocked: {exc.detail}")
                return await self._build_response(
                    transcript=raw_text,
                    intent=intent,
                    action="EXECUTION_BLOCKED_OFFLINE",
                    response=f"Turn command validated for {angle_deg}° {direction_str}, but the physical rover is offline (ESP32 unreachable).",
                    needs_clarification=False,
                    command_payload={"direction": direction_str, "angle": angle_deg},
                    executed=False,
                    execution_result={"error": exc.detail, "status_code": exc.status_code},
                    rover_state=rover_service.state.value
                )

        if intent == "TURN_AMBIGUOUS":
            clarification_msg = "Which direction should I turn? Please say 'turn left' or 'turn right', and specify the angle."
            return await self._build_response(
                transcript=raw_text,
                intent="TURN_AMBIGUOUS",
                action="REQUEST_CLARIFICATION",
                response=clarification_msg,
                needs_clarification=True,
                clarification_prompt=clarification_msg,
                executed=False,
                rover_state=rover_service.state.value
            )

        # ----------------- CASE D: MUSIC COMMANDS -----------------
        if intent == "PLAY_MUSIC":
            self._clear_pending(session_id)
            await mood_service.set_mood("EXCITED", auto_revert_sec=15.0)
            return await self._build_response(
                transcript=raw_text,
                intent="PLAY_MUSIC",
                action="MUSIC_PLAY",
                response="Pumping neon synthwave through cyber audio sub-routines! Volume calibrated.",
                needs_clarification=False,
                command_payload={"track": "Neon Odyssey (VibeSetter Mix)", "action": "play"},
                executed=True,
                rover_state=rover_service.state.value
            )

        if intent == "STOP_MUSIC":
            self._clear_pending(session_id)
            await mood_service.set_mood("IDLE", auto_revert_sec=4.0)
            return await self._build_response(
                transcript=raw_text,
                intent="STOP_MUSIC",
                action="MUSIC_STOP",
                response="Audio playback paused. Silence engaged.",
                needs_clarification=False,
                command_payload={"action": "stop"},
                executed=True,
                rover_state=rover_service.state.value
            )

        # ----------------- CASE E: EXPRESSION COMMANDS -----------------
        if intent == "CHANGE_EXPRESSION":
            self._clear_pending(session_id)
            expr = params.get("expression", "happy")
            await mood_service.set_mood(expr.upper())
            return await self._build_response(
                transcript=raw_text,
                intent="CHANGE_EXPRESSION",
                action="EXPRESSION_SET",
                response=f"Expression updated to '{expr.upper()}'. Cyberpunk visor matrix reconfigured.",
                needs_clarification=False,
                command_payload={"expression": expr},
                executed=True,
                rover_state=rover_service.state.value
            )

        # ----------------- CASE F: GENERAL CONVERSATION (OLLAMA 3B) -----------------
        self._clear_pending(session_id)
        # Shift to THINKING eyes while Ollama 3B processes
        await mood_service.set_mood("THINKING")

        telemetry = {
            "rover_state": rover_service.state.value,
            "battery_percentage": rover_service.battery_percentage,
            "battery_voltage": rover_service.battery_voltage,
            "esp32_connected": rover_service.esp32_connected
        }
        # Query local Ollama 3B model
        reply = await ollama_service.chat(raw_text, telemetry=telemetry)

        # Check positive conversation sentiment
        lower_reply = reply.lower()
        if any(w in lower_reply for w in ["love", "happy", "joy", "awesome", "great", "fun", "vibe", "cool", "explore", "excited"]):
            await mood_service.set_mood("HAPPY", auto_revert_sec=8.0)
        else:
            await mood_service.set_mood("TALKING", auto_revert_sec=6.0)

        return await self._build_response(
            transcript=raw_text,
            intent="GENERAL_CONVERSATION",
            action="AI_CHAT",
            response=reply,
            needs_clarification=False,
            rover_state=rover_service.state.value
        )

    def _generate_companion_response(self, text: str) -> str:
        """Generates dynamic AI companion dialogue incorporating live rover telemetry."""
        lower = text.lower()

        # Telemetry: Battery
        if "battery" in lower or "charge" in lower or "power" in lower:
            batt = rover_service.battery_percentage
            volt = rover_service.battery_voltage
            if batt is not None:
                return f"Battery capacity is currently at {batt:.0f}% ({volt:.1f}V). Power cells are nominal."
            return "Battery telemetry is awaiting connection to the ESP32 power management shield."

        # Telemetry: Connection / Status
        if "connected" in lower or "connection" in lower or "online" in lower or "wifi" in lower:
            if rover_service.esp32_connected:
                return f"All telemetry links active! Physical ESP32 connected at {settings.ESP32_BASE_URL}."
            return f"Currently running in autonomous local mode. Physical ESP32 ({settings.ESP32_BASE_URL}) is offline."

        # General status
        if "status" in lower or "report" in lower or "diagnostics" in lower:
            state = rover_service.state.value
            return f"Systems status report: Current state is {state}. Safety interlocks active. Neural conversational engine online."

        # Identity
        if "who are you" in lower or "what is your name" in lower:
            return "I am VIBESETTER OS — your futuristic cyber companion rover. I navigate physical space, play music, show expressions, and sync to your vibe."

        # Capabilities
        if "what can you do" in lower or "help" in lower or "commands" in lower:
            return (
                "You can tell me to move forward or backward with a distance (e.g. 'move forward 50 cm'), "
                "turn left or right (e.g. 'turn right 90 degrees'), say 'stop' anytime to brake, "
                "'play music', 'stop music', or 'change expression to happy'!"
            )

        # Greetings
        if any(w in lower for w in ["hello", "hi", "hey", "yo", "sup", "greetings"]):
            return "Hey there! VibeSetter neural core active and listening. What are your orders?"

        # Default companion response
        return f"Neural core processed: '{text}'. All systems standing by for your next navigation or vibe command."


# Singleton instance
voice_service = VoiceService()

