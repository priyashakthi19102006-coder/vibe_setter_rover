# VIBESETTER OS 🚀
> **Your AI Companion. Your Mood. Your Vibe.**  
> Futuristic Cybernetic AI Companion Rover Control Dashboard & Dual Microcontroller Hardware Bridge.

[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Ollama](https://img.shields.io/badge/Ollama-3B_Local_AI-FF6F00?logo=ollama&logoColor=white)](https://ollama.com/)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32%20%2B%20Arduino-E7352C?logo=espressif&logoColor=white)](https://www.espressif.com/)

---

## 🌌 1. Introduction & Project Objectives

**VIBESETTER OS** is an open-source, full-stack cybernetic companion rover platform. It bridges a modern, futuristic cyberpunk web dashboard with physical rover hardware, embedding a local, private neural personality (Ollama 3B) inside a physical rover body equipped with animated OLED expressive eyes, voice conversation processing, text-to-speech feedback, synchronized music playback, and safety-interlocked motion actuation.

### Core Objectives:
1. **Interactive Companion Experience**: Combine conversational AI, dynamic OLED facial expressions, and synthesized speech into an expressive physical robot.
2. **Deterministic & Safe Rover Control**: Disallow raw, unvalidated LLM output from driving physical motors. All motor commands pass through a deterministic safety layer, validation boundaries, and an instant emergency stop bus.
3. **Hardware Agnostic & Resilient**: The frontend dashboard remains fully operational in local connection recovery mode when hardware or local backend components are disconnected.
4. **Local & Privacy-First**: Conversational intelligence runs locally via Ollama (qwen2.5:3b) without third-party cloud data exfiltration or recurring subscription costs.

---

## ⚡ 2. Complete Feature List

- **Cyberpunk Telemetry Dashboard**:
  - Deep black aesthetic (`#030712`) with neon purple accents (`#a855f7`), glowing borders, and glassmorphic cards.
  - Real-time battery status (percentage, voltage, charging state).
  - Live system clock and dynamic latency ping indicator.
  - Distinct connection status badge (`🟢 Backend Online` / `🔴 Backend Offline`).
- **Safety-Interlocked Rover Control**:
  - Directional navigation panel (Forward, Backward, Left, Right).
  - Discrete distance presets (10 cm, 25 cm, 50 cm, 1 m, custom input).
  - Calibrated rotation pivots (Turn Left 45°/90°, Turn Right 45°/90°).
  - Prominent, always-available **Emergency STOP** button with zero latency.
  - Verified backend status telemetry; never fabricates movement.
- **Local Neural Companion (Ollama 3B)**:
  - Powered by local `qwen2.5:3b` model through Ollama.
  - Energetic, friendly companion persona aware of its physical robot body.
  - Graceful fallback when the Ollama daemon is offline.
- **Voice Command & Audio Pipeline**:
  - Speech-to-Text browser interface with audio waveform visualization.
  - Safe intent classification router (distinguishes physical movement commands from casual conversation).
  - Clarification loop: requests missing distance/angle parameters before dispatching.
  - Backend Text-to-Speech (TTS) engine returning playable synthesized speech.
- **OLED Emotion & Expression System**:
  - 9 distinct mood states: `HAPPY`, `EXCITED`, `SAD`, `ANGRY`, `SLEEPY`, `THINKING`, `LISTENING`, `TALKING`, `IDLE`.
  - Non-blocking `millis()`-based animation engine on SSD1306 128x64 OLED.
  - Interactive visual preview in the web UI synchronized with the physical rover.
- **Music Player & Timestamped Synchronized Lyrics**:
  - Modular audio library supporting local and royalty-free tracks.
  - LRC-style millisecond timestamped lyric synchronization with auto-scrolling.
  - Reactive rover mood triggers when music plays (`EXCITED` / `HAPPY`).

---

## 🏗️ 3. System Architecture & Dataflow

```mermaid
graph TD
    subgraph Browser ["Frontend Dashboard (React 19 + Vite)"]
        UI_Dash["Dashboard & Telemetry Cards"]
        UI_Control["Direction & Rotation Controls"]
        UI_Voice["Voice Input & Wave Visualizer"]
        UI_Mood["Emotion & Eye Selector"]
        UI_Music["Music Player & Synced Lyrics"]
        Hook_Telem["useRoverTelemetry Hook"]
    end

    subgraph Server ["Python FastAPI Backend (:8000)"]
        API_Router["REST API Endpoints (/api/*)"]
        WS_Server["WebSocket Telemetry Stream (/ws/status)"]
        Svc_Rover["RoverService (Safety & State Coordinator)"]
        Svc_Voice["VoiceService (Intent Classifier & Router)"]
        Svc_Ollama["OllamaService (Local LLM Connector)"]
        Svc_TTS["TTSService (Speech Audio Synthesizer)"]
        Svc_Mood["MoodService (OLED Expression Coordinator)"]
    end

    subgraph LLM ["Local AI Brain (:11434)"]
        Ollama_Engine["Ollama 3B Engine (qwen2.5:3b)"]
    end

    subgraph Hardware ["Physical Embedded Hardware"]
        MCU_ESP32["ESP32 DevKit (Master WiFi & Telemetry MCU)"]
        Display_OLED["SSD1306 128x64 OLED (Animated Eyes)"]
        Sensor_IMU["MPU6050 6-Axis Gyro/Accelerometer"]
        Audio_Mic["INMP441 I2S Digital Microphone"]
        Audio_Amp["PAM8403 3W Amp + Stereo Speakers"]
        MCU_Arduino["Arduino Uno / Nano (Dedicated Motor Slave)"]
        Driver_L293D["L293D / L298N Dual H-Bridge Motor Driver"]
        Motors_DC["4x DC Motors with Optical Encoders"]
    end

    %% Web UI to Backend
    UI_Control -->|POST /api/rover/move, /turn, /stop| API_Router
    UI_Voice -->|POST /api/voice/process| API_Router
    UI_Mood -->|POST /api/mood/set| API_Router
    UI_Music -->|POST /api/music/play| API_Router
    WS_Server <-->|ws://127.0.0.1:8000/ws/status| Hook_Telem

    %% Backend Internals
    API_Router --> Svc_Rover
    API_Router --> Svc_Voice
    API_Router --> Svc_Mood
    Svc_Voice --> Svc_Ollama
    Svc_Voice --> Svc_TTS
    Svc_Ollama <--> Ollama_Engine

    %% Backend to Hardware
    Svc_Rover -->|HTTP REST: /move, /turn, /stop| MCU_ESP32
    Svc_Mood -->|HTTP REST: /expression| MCU_ESP32

    %% Embedded Interconnects
    MCU_ESP32 -->|I2C SDA/SCL (GPIO 21/22)| Display_OLED
    MCU_ESP32 -->|I2C SDA/SCL (GPIO 21/22)| Sensor_IMU
    MCU_ESP32 -->|I2S Audio (GPIO 14/15/32)| Audio_Mic
    MCU_ESP32 -->|DAC1 Analog Out (GPIO 25)| Audio_Amp
    MCU_ESP32 -->|UART Serial 115200 baud| MCU_Arduino
    MCU_Arduino -->|PWM & Logic Pins| Driver_L293D
    Driver_L293D --> Motors_DC
```

---

## 🛠️ 4. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS, Framer Motion, Lucide React, React Router v7 |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, WebSockets, HTTPX, Pydantic v2, Pyttsx3 |
| **Local Intelligence**| Ollama, Qwen2.5:3B / Llama 3.2:3B, PyTorch / Onnx / Edge-TTS |
| **Microcontrollers** | ESP32 DevKit (Xtensa dual-core), Arduino Uno (ATmega328P) |
| **Firmware Libraries**| ArduinoJson, Adafruit SSD1306, Adafruit GFX, Adafruit MPU6050, Wire, WiFi |
| **Actuation & Sensors**| L293D / L298N Motor Driver, SSD1306 OLED, MPU6050 IMU, INMP441 MEMS Mic, PAM8403 Amp |

---

## 🔌 5. Hardware Architecture & Electrical Connections

For comprehensive wiring diagrams and schematic calculations, see [`docs/hardware_connections.md`](file:///c:/Users/priya%20shakthi/OneDrive/Desktop/VibeSetter%20Rover/docs/hardware_connections.md).

### 5.1. ESP32 & Arduino Uno Inter-Board Communication
The ESP32 communicates with the Arduino Uno via high-speed UART Serial at **115200 baud**:
- **ESP32 TX (GPIO 17)** $\rightarrow$ **Arduino Uno RX (Pin 0 / 10)** *(3.3V logic meets 5V TTL threshold)*
- **Arduino Uno TX (Pin 1 / 11)** $\rightarrow$ **Voltage Divider (1kΩ / 2kΩ)** $\rightarrow$ **ESP32 RX (GPIO 16)** *(Converts 5V down to safe ~3.3V)*
- **GND** $\leftrightarrow$ **Common Ground** *(Mandatory for reliable signal transmission)*

### 5.2. L293D Motor Driver Connections
| Signal Name | Arduino Uno Pin | L293D IC Pin | Purpose |
| :--- | :--- | :--- | :--- |
| **Left Speed PWM** | **Pin 5** | Pin 1 (`1,2EN`) | PWM Speed Control (0-255) |
| **Left IN1** | **Pin 4** | Pin 2 (`1A`) | Left Motor Polarity |
| **Left IN2** | **Pin 2** | Pin 7 (`2A`) | Left Motor Polarity |
| **Right Speed PWM**| **Pin 6** | Pin 9 (`3,4EN`) | PWM Speed Control (0-255) |
| **Right IN3** | **Pin 7** | Pin 10 (`3A`) | Right Motor Polarity |
| **Right IN4** | **Pin 8** | Pin 15 (`4A`) | Right Motor Polarity |
| **Logic 5V** | **5V Pin** | Pin 16 (`VCC1`) | Logic Power |
| **Motor VM** | **VIN / Battery**| Pin 8 (`VCC2`) | Motor Power (7.4V - 11.1V LiPo) |
| **GND** | **GND** | Pins 4, 5, 12, 13 | Common Ground & Heatsink |

### 5.3. SSD1306 OLED & MPU6050 IMU (I2C)
Both modules share the hardware I2C bus on the ESP32:
- `SDA` $\rightarrow$ **ESP32 GPIO 21**
- `SCL` $\rightarrow$ **ESP32 GPIO 22**
- `VCC` $\rightarrow$ **3.3V**
- `GND` $\rightarrow$ **GND**
*(OLED I2C Address: `0x3C`, MPU6050 I2C Address: `0x68`)*

### 5.4. INMP441 I2S Digital Microphone
- `VDD` $\rightarrow$ **3.3V** | `GND` $\rightarrow$ **GND** | `L/R` $\rightarrow$ **GND (Left Channel)**
- `WS` $\rightarrow$ **ESP32 GPIO 15** | `SCK` $\rightarrow$ **ESP32 GPIO 14** | `SD` $\rightarrow$ **ESP32 GPIO 32**

### 5.5. PAM8403 3W Audio Amplifier & Speakers
- `+5V` $\rightarrow$ **Clean 5V Regulator** | `GND` $\rightarrow$ **Audio Ground**
- `L_IN` $\rightarrow$ **ESP32 GPIO 25 (DAC1 Analog Audio)** via 10µF DC decoupling capacitor
- `L_OUT (+/-)` $\rightarrow$ **Left 4Ω 3W Speaker** *(Bridged Tied Load: Do NOT ground speaker negative!)*
- `R_OUT (+/-)` $\rightarrow$ **Right 4Ω 3W Speaker**

---

## 🚀 6. Installation & Local Development

### 6.1. Start Local Ollama 3B Model
```powershell
ollama pull qwen2.5:3b
ollama serve
```

### 6.2. Start Python FastAPI Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- WebSocket Stream: `ws://127.0.0.1:8000/ws/status`

### 6.3. Start React Frontend Dashboard
From the project root:
```powershell
npm install
npm run dev
```
*(Or navigate to `cd frontend` and run `npm run dev`)*  
Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in your browser.

---

## 💾 7. Firmware Flashing Instructions

### ESP32 Master Firmware
1. Open the Arduino IDE.
2. Open [`firmware/esp32/main.ino`](file:///c:/Users/priya%20shakthi/OneDrive/Desktop/VibeSetter%20Rover/firmware/esp32/main.ino).
3. Set your Wi-Fi SSID and password in lines 75-76.
4. Select Board: **ESP32 Dev Module**.
5. Select Port and click **Upload**.

### Arduino Uno Motor Firmware
1. In the Arduino IDE, open [`firmware/arduino/motor_controller.ino`](file:///c:/Users/priya%20shakthi/OneDrive/Desktop/VibeSetter%20Rover/firmware/arduino/motor_controller.ino).
2. Select Board: **Arduino Uno**.
3. Select Port and click **Upload**.
4. Test by opening Serial Monitor at **115200 baud** and sending `F 200 1000`.

---

## 🔧 8. Troubleshooting

| Symptom | Probable Cause | Action |
| :--- | :--- | :--- |
| **Dashboard displays `🔴 Backend Offline`** | Backend server is stopped or port 8000 is blocked | Start FastAPI server (`python -m uvicorn backend.main:app`); check `http://127.0.0.1:8000/api/health` |
| **Controls locked with Safety Interlock** | ESP32 hardware is disconnected or Wi-Fi IP changed | Check `ESP32_BASE_URL` in `backend/.env`. Controls unlock when ESP32 acknowledges ping |
| **Ollama query timeout** | Ollama daemon not running or model not pulled | Run `ollama list` to confirm `qwen2.5:3b` exists; run `ollama serve` |
| **Motors do not rotate** | Motor power disconnected or missing Common Ground | Connect battery ground directly to Arduino and ESP32 GND. Confirm motor voltage > 7.4V |
| **OLED display is dark** | Mismatched I2C pins or wrong address | Verify SDA is on GPIO 21 and SCL on GPIO 22; check default address `0x3C` |

---

## 🔮 9. Future Improvements

- **SLAM & LiDAR Obstacle Avoidance**: Integration with RPLiDAR A1 for real-time 2D grid mapping.
- **Edge Vision & Face Tracking**: Integrating an ESP32-CAM module for vision-based companion tracking.
- **OTA (Over-The-Air) Firmware Updates**: Remotely flashing ESP32 firmware directly from the VIBESETTER OS settings panel.
- **Mobile PWA Support**: Adding Progressive Web App service workers for seamless tablet and smartphone control.

---

## 📄 License
MIT License. Built for makers, robotics enthusiasts, and AI researchers.
