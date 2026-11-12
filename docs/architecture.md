# VIBESETTER OS — System Architecture Specification

## 1. Executive Overview

**VIBESETTER OS** is an end-to-end cybernetic companion rover platform integrating a modern React 19 web telemetry dashboard, a high-throughput Python FastAPI backend, local Ollama 3B neural personality engine, and a dual-microcontroller embedded control fabric (ESP32 Master + Arduino Uno Slave).

---

## 2. Global Architecture Diagram

```mermaid
graph TD
    subgraph UI ["Frontend Dashboard (React 19 + Vite)"]
        Nav["Top Navbar & Battery Status"]
        ControlUI["Rover Movement & Rotation Controls"]
        VoiceUI["Voice Command & Mic Input"]
        MoodUI["Emotion & OLED Preview"]
        MusicUI["Music Player & Synced Lyrics"]
        TelemHook["useRoverTelemetry Hook"]
    end

    subgraph Backend ["FastAPI Python Server (:8000)"]
        REST["REST API Endpoints (/api/*)"]
        WS["WebSocket Telemetry Stream (/ws/status)"]
        RoverSvc["RoverService (Safety & State Coordinator)"]
        VoiceSvc["VoiceService (Speech & Intent Classification)"]
        OllamaSvc["OllamaService (Local LLM Companion Brain)"]
        TTSSvc["TTSService (Audio Synthesis Engine)"]
        MoodSvc["MoodService (OLED Animation Coordinator)"]
    end

    subgraph AI ["Local Neural Engine (:11434)"]
        OLLAMA["Ollama 3B (qwen2.5:3b)"]
    end

    subgraph Embedded ["Embedded Hardware Fabric"]
        ESP32["ESP32 DevKit (Master Controller)"]
        OLED["SSD1306 128x64 OLED (Animated Eyes)"]
        IMU["MPU6050 6-Axis IMU (Yaw Integration)"]
        MIC["INMP441 I2S Digital Microphone"]
        AMP["PAM8403 Amplifier + 3W Speakers"]
        Arduino["Arduino Uno / Nano (Slave Motor MCU)"]
        Driver["L293D / L298N 4-Channel Motor Driver"]
        Motors["4x DC Gearmotors + Encoders"]
    end

    %% Frontend to Backend
    ControlUI -->|POST /api/rover/move, /turn, /stop| REST
    VoiceUI -->|POST /api/voice/process| REST
    MoodUI -->|POST /api/mood/set| REST
    REST --> TelemHook
    WS <-->|ws://127.0.0.1:8000/ws/status| TelemHook

    %% Backend Internal
    REST --> RoverSvc
    REST --> VoiceSvc
    REST --> MoodSvc
    VoiceSvc --> OllamaSvc
    VoiceSvc --> TTSSvc
    OllamaSvc <--> OLLAMA

    %% Backend to Hardware
    RoverSvc -->|HTTP REST: /move, /turn, /stop| ESP32
    MoodSvc -->|HTTP REST: /expression| ESP32

    %% Hardware Interconnects
    ESP32 -->|I2C SDA/SCL| OLED
    ESP32 -->|I2C SDA/SCL| IMU
    ESP32 -->|I2S Bus| MIC
    ESP32 -->|DAC / PWM Audio| AMP
    ESP32 -->|UART Serial (115200 baud)| Arduino
    Arduino -->|PWM & H-Bridge Direction| Driver
    Driver --> Motors
```

---

## 3. Subsystem Breakdown

### 3.1. Frontend Telemetry & Reactive Core
- **Framework**: React 19 bootstrapped with Vite 8.
- **State Flow**: Centralized via `useRoverTelemetry` hook maintaining WebSocket connection with automatic HTTP health polling fallback (`/health` & `/system/ping`).
- **Resilience Policy**: If backend or hardware is disconnected, local recovery mode triggers. Visual telemetry widgets load safe fallback structures, while physical movement controls engage a safety lock to prevent accidental dispatches.
- **Visual Styling**: Cyberpunk deep black (`#030712`) backdrop, neon purple accents (`#a855f7`), glassmorphic backdrop filters, and KaTeX-based sensor telemetry representations.

### 3.2. FastAPI Backend Engine
- **Asynchronous Lifespan**: Initializes persistent HTTP connection pools for the ESP32 microcontroller and spins a background telemetry loop broadcasting status frames at 1 Hz over WebSockets.
- **CORS Architecture**: Dynamically reflects trusted localhost/127.0.0.1 origins across all development ports.
- **Endpoint Structure**:
  - `GET /api/health` & `GET /`: Instantaneous server healthcheck reporting `status: online`.
  - `POST /api/rover/move`: Validates direction (`forward`, `backward`, `left`, `right`) and distance (`1.0` - `500.0` cm). Strictly requires physical ESP32 HTTP 200 acknowledgment.
  - `POST /api/rover/turn`: Validates pivot direction and angle (`1.0` - `360.0` degrees).
  - `POST /api/rover/stop`: Priority emergency motor cutoff. Always accessible regardless of connection state.
  - `GET /api/rover/status`: Returns verified hardware telemetry without fabricating sensor readings.

### 3.3. Dual Microcontroller Split (ESP32 Master + Arduino Uno Slave)
To prevent motor PWM switching noise and inductive voltage spikes from destabilizing sensitive Wi-Fi and audio tasks:
1. **ESP32 Master**:
   - Manages Wi-Fi networking (Station / AP mode) and FastAPI HTTP endpoints.
   - Drives SSD1306 128x64 OLED displaying animated robot eye expressions.
   - Reads MPU6050 6-axis gyroscope for closed-loop heading and pivot turning.
   - Interfaces with INMP441 I2S microphone for speech capture.
   - Transmits high-level drive instructions to the Arduino Uno via UART Serial (`115200` baud).
2. **Arduino Uno Slave**:
   - Dedicated motor actuator.
   - Interfaces with L293D dual H-bridge motor driver.
   - Houses a 2500ms safety watchdog timer that forcibly halts motors if serial communication drops.

---

## 4. Safety Architecture & Fail-Safe Matrix

| Event | System Response | Hardware State |
| :--- | :--- | :--- |
| **Emergency STOP Clicked** | API immediately bypasses queue, sends stop packet, broadcasts to WebSockets | Motors immediately cut to 0% PWM |
| **Wi-Fi / Network Disconnect** | ESP32 watchdog trips after timeout (`3.0s`) | ESP32 commands motor driver stop |
| **UART Serial Disconnect** | Arduino Uno watchdog trips after `2.5s` | Arduino pulls all L293D enable pins LOW |
| **Backend Unreachable** | Frontend engages Connection Recovery Mode; locks directional buttons | Controls locked; user alerted |
| **Ollama Service Offline** | Voice service returns structured fallback message | Rover remains safely stationary |
