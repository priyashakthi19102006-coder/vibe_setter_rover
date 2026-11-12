# VIBESETTER OS — Comprehensive Setup & Installation Guide

This guide covers the complete step-by-step procedure to set up, configure, and run VIBESETTER OS across the web dashboard, Python backend, local Ollama 3B AI companion, and microcontroller firmware.

---

## 📋 Prerequisites & Tools

| Component | Minimum Version | Download Link / Command |
| :--- | :--- | :--- |
| **Node.js** | `v18.0.0+` (v20+ recommended) | [nodejs.org](https://nodejs.org/) |
| **Python** | `3.10+` (3.11 / 3.12 / 3.14) | [python.org](https://www.python.org/) |
| **Ollama** | Latest | [ollama.com](https://ollama.com/) |
| **Arduino IDE** | `2.x+` (or PlatformIO) | [arduino.cc](https://www.arduino.cc/) |
| **Git** | `2.30+` | [git-scm.com](https://git-scm.com/) |

---

## 1. Local AI Companion Setup (Ollama 3B)

VIBESETTER OS utilizes a local 3-billion-parameter language model as the rover's conversational brain and emotional reasoning core.

1. **Install Ollama**:
   Download and install Ollama from [ollama.com](https://ollama.com/).

2. **Pull the Companion Model**:
   ```powershell
   ollama pull qwen2.5:3b
   ```
   *(Alternative: `ollama pull llama3.2:3b`)*

3. **Verify Ollama Server**:
   ```powershell
   curl http://localhost:11434/api/tags
   ```
   Confirm that `qwen2.5:3b` is listed in the response.

---

## 2. Backend Installation & Startup (Python FastAPI)

1. **Navigate to the Backend Directory**:
   ```powershell
   cd backend
   ```

2. **Create and Activate a Virtual Environment**:
   ```powershell
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Required Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```powershell
   cp .env.example .env
   ```
   Adjust parameters if needed:
   ```ini
   HOST=127.0.0.1
   PORT=8000
   DEBUG=false
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000
   ESP32_BASE_URL=http://192.168.4.1
   ESP32_TIMEOUT_SECONDS=3.0
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=qwen2.5:3b
   ```

5. **Launch the FastAPI Server**:
   ```powershell
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

6. **Verify Backend Health**:
   - Healthcheck: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
   - Interactive Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Real-Time WebSocket Endpoint: `ws://127.0.0.1:8000/ws/status`

---

## 3. Frontend Installation & Startup (React 19 + Vite)

1. **Navigate to Frontend Directory**:
   ```powershell
   cd frontend
   ```

2. **Install Node Dependencies**:
   ```powershell
   npm install
   ```

3. **Configure Frontend Environment**:
   Copy `.env.example` to `.env`:
   ```powershell
   cp .env.example .env
   ```
   Verify URLs:
   ```ini
   VITE_API_URL=http://127.0.0.1:8000
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   VITE_WS_URL=ws://127.0.0.1:8000/ws/status
   VITE_USE_MOCK=false
   ```

4. **Start the Frontend Development Server**:
   ```powershell
   npm run dev
   ```
   Open **`http://127.0.0.1:5173`** in your web browser.
   - The top navigation bar will show **`🟢 Backend Online`**.
   - If the backend is stopped, it gracefully displays **`🔴 Backend Offline`** and engages connection recovery mode without crashing.

5. **Build for Production**:
   ```powershell
   npm run build
   ```

---

## 4. Firmware Flashing Guide

### 4.1. ESP32 Master Firmware
1. Open Arduino IDE.
2. In **Boards Manager**, install `esp32` by *Espressif Systems*.
3. In **Library Manager**, install:
   - `ArduinoJson` (v6 or v7)
   - `Adafruit SSD1306`
   - `Adafruit GFX Library`
   - `Adafruit MPU6050`
   - `Adafruit Unified Sensor`
4. Open [`firmware/esp32/main.ino`](file:///c:/Users/priya%20shakthi/OneDrive/Desktop/VibeSetter%20Rover/firmware/esp32/main.ino).
5. Set your Wi-Fi credentials in lines 75-76 (`STA_SSID` and `STA_PASS`).
6. Select Board: **ESP32 Dev Module** (or your specific ESP32 variant).
7. Select your USB COM port and click **Upload**.
8. Open the Serial Monitor at **115200 baud** to note the assigned IP address.

### 4.2. Arduino Uno Motor Slave Firmware
1. Open Arduino IDE.
2. Open [`firmware/arduino/motor_controller.ino`](file:///c:/Users/priya%20shakthi/OneDrive/Desktop/VibeSetter%20Rover/firmware/arduino/motor_controller.ino).
3. Select Board: **Arduino Uno**.
4. Select the corresponding USB COM port and click **Upload**.
5. Open the Serial Monitor at **115200 baud**.
6. Type `F 200 1000` and press Enter to verify motor actuation.

---

## 5. End-to-End Troubleshooting Matrix

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **"Backend Offline" on dashboard** | Port mismatch or backend not running | Start backend on port 8000; check `http://127.0.0.1:8000/api/health` |
| **CORS policy error in browser** | Port not in allowed list | Check `CORS_ORIGINS` in `backend/.env`. Origins matching `127.0.0.1` and `localhost` are allowed by default |
| **Ollama connection timeout** | Ollama service not running | Run `ollama serve` and confirm model is pulled via `ollama list` |
| **OLED display is blank** | Incorrect I2C address | Confirm address in firmware (`0x3C` for 128x64 SSD1306). Run an I2C scanner sketch |
| **Motors do not move** | Missing common ground or low battery voltage | Ensure LiPo voltage is > 7.4V and ground of motor driver is tied to Arduino & ESP32 ground |
| **Motors do not stop when signal drops** | Watchdog inactive | Confirm `firmware/arduino/motor_controller.ino` is uploaded with `WATCHDOG_TIMEOUT_MS = 2500` |
