# VIBESETTER OS — Firmware Directory & Hardware Flashing Guide

This directory contains the physical microcontroller firmware powering the VIBESETTER AI Companion Rover.

---

## 📁 Firmware Structure

```
firmware/
├── esp32/
│   └── main.ino                 # ESP32 Master Firmware (Wi-Fi, HTTP API, OLED, MPU6050, UART)
├── arduino/
│   └── motor_controller.ino     # Arduino Uno / Nano dedicated L293D motor slave controller
├── rover_esp32.ino              # Single-file ESP32 firmware mirror
└── README.md                    # Hardware wiring, library setup & bench test guide
```

---

## ⚡ Architecture Modes

The rover supports two hardware deployment configurations:

### Configuration 1: All-in-One ESP32 Controller
The ESP32 runs [`firmware/esp32/main.ino`](file:///c:/Users/priya%20shakthi/OneDrive/Desktop/VibeSetter%20Rover/firmware/esp32/main.ino) and directly drives the motor driver (L298N / TB6612FNG / L293D), SSD1306 OLED, and MPU6050 IMU.

### Configuration 2: Dual Controller (ESP32 Master + Arduino Uno Slave)
- **ESP32** runs [`firmware/esp32/main.ino`](file:///c:/Users/priya%20shakthi/OneDrive/Desktop/VibeSetter%20Rover/firmware/esp32/main.ino) handling Wi-Fi, FastAPI REST communication, OLED emotion display, and speech feedback.
- **Arduino Uno** runs [`firmware/arduino/motor_controller.ino`](file:///c:/Users/priya%20shakthi/OneDrive/Desktop/VibeSetter%20Rover/firmware/arduino/motor_controller.ino) dedicated to 4-channel DC motor control via an L293D shield or IC.
- **Inter-board Link**: High-speed UART Serial at 115200 baud with hardware watchdog auto-stop.

---

## 1. Required Libraries (Arduino IDE / PlatformIO)

Install these libraries via the **Arduino IDE Library Manager** (`Sketch` -> `Include Library` -> `Manage Libraries...`):

1. **`ArduinoJson`** by *Benoît Blanchon* (Version 6.x or 7.x)
2. **`Adafruit SSD1306`** by *Adafruit* (OLED display driver)
3. **`Adafruit GFX Library`** by *Adafruit* (Graphics core)
4. **`Adafruit MPU6050`** by *Adafruit* (6-Axis Accelerometer & Gyroscope)
5. **`Adafruit Unified Sensor`** by *Adafruit* (Sensor abstraction layer)

---

## 2. Pinout & Connection Maps

### A. ESP32 Master Pinout
| Subsystem | Signal Name | ESP32 GPIO | Description / Destination |
| :--- | :--- | :--- | :--- |
| **I2C Bus** | `PIN_I2C_SDA` | **GPIO 21** | Shared I2C Data (OLED & MPU6050) |
| | `PIN_I2C_SCL` | **GPIO 22** | Shared I2C Clock (OLED & MPU6050) |
| **UART to Arduino**| `ESP32_TX` | **GPIO 17** | Serial TX to Arduino RX |
| | `ESP32_RX` | **GPIO 16** | Serial RX from Arduino TX (via level divider) |
| **Motor PWM (Direct)**| `PIN_LEFT_PWM` | **GPIO 14** | Left Motor Speed PWM (0-255) |
| | `PIN_LEFT_IN1` | **GPIO 27** | Left Direction IN1 |
| | `PIN_LEFT_IN2` | **GPIO 26** | Left Direction IN2 |
| | `PIN_RIGHT_PWM`| **GPIO 13** | Right Motor Speed PWM (0-255) |
| | `PIN_RIGHT_IN1`| **GPIO 33** | Right Direction IN3 |
| | `PIN_RIGHT_IN2`| **GPIO 32** | Right Direction IN4 |
| **Status LED** | `PIN_STATUS_LED` | **GPIO 2** | Built-in Blue LED |

### B. Arduino Uno + L293D Motor Controller Pinout
| Function | Arduino Pin | L293D Driver Pin | Notes |
| :--- | :--- | :--- | :--- |
| **Left PWM Enable** | **Pin 5** | EN1,2 (Pin 1) | PWM Speed (0-255) |
| **Left Direction 1** | **Pin 4** | IN1 (Pin 2) | Left Forward/Backward |
| **Left Direction 2** | **Pin 2** | IN2 (Pin 7) | Left Forward/Backward |
| **Right PWM Enable**| **Pin 6** | EN3,4 (Pin 9) | PWM Speed (0-255) |
| **Right Direction 1**| **Pin 7** | IN3 (Pin 10) | Right Forward/Backward |
| **Right Direction 2**| **Pin 8** | IN4 (Pin 15) | Right Forward/Backward |
| **Heartbeat LED** | **Pin 13** | Built-in LED | Blinks every 500ms |

---

## 3. Serial Communication Protocol (ESP32 <-> Arduino Uno)

Commands are sent as newline-terminated ASCII strings at **115200 baud**:

| Command String | Action | Example | Arduino Response |
| :--- | :--- | :--- | :--- |
| `F <speed> [ms]` | Move Forward | `F 220 1000` | `OK F 220` |
| `B <speed> [ms]` | Move Backward | `B 200 1000` | `OK B 200` |
| `L <speed> [ms]` | Pivot Turn Left | `L 220 450` | `OK L 220` |
| `R <speed> [ms]` | Pivot Turn Right| `R 220 450` | `OK R 220` |
| `S` | Emergency STOP | `S` | `OK STOP` |
| `STATUS` | Status Request | `STATUS` | `{"state":"STOPPED","left_pwm":0,"right_pwm":0,"uptime_s":42}` |
| `PING` | Link Heartbeat | `PING` | `PONG` |

---

## 4. Bench Testing & Safety Verification

1. **Bench Test Before Driving**: Place rover chassis on a stand with wheels suspended off the table.
2. **Watchdog Verification**: Disconnect communication during movement; confirm motors brake within 2.5 seconds.
3. **Common Ground**: Ensure battery ground, ESP32 ground, and Arduino/driver ground are tied together.
