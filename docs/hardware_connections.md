# VIBESETTER OS — Hardware Connections & Wiring Guide

This guide details the complete electrical wiring, pin mappings, level shifting, and power distribution for the physical VIBESETTER AI Companion Rover.

---

## 1. Power Supply & Ground Distribution

> [!CAUTION]
> **COMMON GROUND IS MANDATORY**: All grounds (Battery (-), LM2596 GND, ESP32 GND, Arduino GND, Motor Driver GND, and Audio GND) MUST be connected together. Floating grounds cause erratic serial data, motor jitter, and resets.

```
                  +-----------------------------------+
                  |   2S / 3S LiPo Battery (7.4V-11.1V)|
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          | (+)                                               | (+)
          v                                                   v
+-----------------------+                           +-------------------+
| LM2596 Buck Converter |                           | L293D / L298N VCC |
| (Step-down to 5.0V)   |                           | (Motor Power VM)  |
+-----------+-----------+                           +---------+---------+
            | (+) 5.0V                                        |
  +---------+---------+                                       |
  |                   |                                       |
  v 5V In             v 5V In                                 v
+-----------+       +---------------+                       +-----------+
| ESP32 VIN |       | Arduino 5V/VIN|                       | 4x Motors |
+-----+-----+       +-------+-------+                       +-----+-----+
      | GND                 | GND                                 | GND
      +---------------------+-------------------------------------+
                            |
                   === COMMON GROUND ===
```

---

## 2. Master Controller: ESP32 Pin Assignment

| Subsystem | Signal Name | ESP32 GPIO | Connected To | Voltage Level |
| :--- | :--- | :--- | :--- | :--- |
| **I2C Bus** | `SDA` | **GPIO 21** | SSD1306 OLED `SDA` & MPU6050 `SDA` | 3.3V Logic |
| | `SCL` | **GPIO 22** | SSD1306 OLED `SCL` & MPU6050 `SCL` | 3.3V Logic |
| **UART Serial Link** | `TX_OUT` | **GPIO 17** | Arduino Uno `RX` (Pin 0 or 10) | 3.3V -> 5V (Direct) |
| | `RX_IN` | **GPIO 16** | Arduino Uno `TX` (via Voltage Divider) | 3.3V Logic Safe |
| **I2S Microphone** | `I2S_WS` | **GPIO 15** | INMP441 `WS` (Word Select / L/R Clock) | 3.3V Logic |
| | `I2S_SCK` | **GPIO 14** | INMP441 `SCK` (Serial Bit Clock) | 3.3V Logic |
| | `I2S_SD` | **GPIO 32** | INMP441 `SD` (Serial Data Out) | 3.3V Logic |
| **Audio Output** | `DAC_OUT` | **GPIO 25** | PAM8403 `L_IN` or `R_IN` | Analog Audio |
| **Wheel Encoders** | `ENC_LEFT` | **GPIO 34** | Left Wheel Optical Sensor Out | 3.3V Input Only |
| | `ENC_RIGHT`| **GPIO 35** | Right Wheel Optical Sensor Out | 3.3V Input Only |
| **Status LED** | `LED_BUILTIN` | **GPIO 2** | Onboard Blue LED | 3.3V |

---

## 3. Slave Controller: Arduino Uno & L293D Motor Driver

### 3.1. Arduino Uno to L293D Driver Pinout
| Signal Name | Arduino Uno Pin | L293D IC Pin | Purpose |
| :--- | :--- | :--- | :--- |
| **Left PWM (Speed)** | **Pin 5** (Timer 0) | Pin 1 (`1,2EN`) | PWM Speed (0 - 255) |
| **Left Direction 1** | **Pin 4** | Pin 2 (`1A / IN1`) | Direction polarity |
| **Left Direction 2** | **Pin 2** | Pin 7 (`2A / IN2`) | Direction polarity |
| **Right PWM (Speed)**| **Pin 6** (Timer 0) | Pin 9 (`3,4EN`) | PWM Speed (0 - 255) |
| **Right Direction 1**| **Pin 7** | Pin 10 (`3A / IN3`)| Direction polarity |
| **Right Direction 2**| **Pin 8** | Pin 15 (`4A / IN4`)| Direction polarity |
| **Logic VCC** | **5V Pin** | Pin 16 (`VCC1`)| 5V Logic power |
| **Motor VCC** | **VIN / Battery** | Pin 8 (`VCC2 / VM`)| 7V - 12V Motor power |
| **GND** | **GND Pin** | Pins 4, 5, 12, 13 | Heatsink GND |

---

## 4. ESP32 <-> Arduino Uno UART Voltage Divider

The Arduino Uno operates at 5V logic, while the ESP32 operates at 3.3V logic. Connecting a 5V Arduino output pin directly to an ESP32 input pin will damage the ESP32.

```
Arduino Uno TX (Pin 1 or 11) [5V]
             |
             |
           [ 1kΩ Resistor ]
             |
             +------> ESP32 RX (GPIO 16) [~3.3V Safe]
             |
           [ 2kΩ Resistor ]
             |
            GND
```

*Note: ESP32 TX (GPIO 17, 3.3V) can directly drive Arduino Uno RX (Pin 0 or 10) without level shifting, as 3.3V meets the TTL logic HIGH threshold (Vih >= 3.0V) on the ATmega328P.*

---

## 5. INMP441 I2S Digital Microphone Wiring

| INMP441 Pin | ESP32 GPIO | Description |
| :--- | :--- | :--- |
| **VDD** | **3.3V** | 3.3V Clean Power |
| **GND** | **GND** | System Ground |
| **SD** | **GPIO 32** | Serial Data Input |
| **SCK** | **GPIO 14** | Serial Clock |
| **WS** | **GPIO 15** | Word Select (Left/Right Clock) |
| **L/R** | **GND** | Left channel select |

---

## 6. PAM8403 3W Stereo Audio Amplifier Wiring

| PAM8403 Pin | Connected To | Notes |
| :--- | :--- | :--- |
| **+5V** | **5V Regulator Out** | Dedicated clean 5V line (place 470µF cap across power) |
| **GND** | **Common Ground** | Audio ground |
| **L_IN** | **ESP32 GPIO 25 (DAC1)**| Left Channel Analog Audio (via 10µF coupling capacitor) |
| **R_IN** | **ESP32 GPIO 25 or GND** | Can bridge to L_IN for dual mono |
| **L_OUT (+/-)** | **Left Speaker (4Ω 3W)** | DO NOT connect negative terminal to ground! |
| **R_OUT (+/-)** | **Right Speaker (4Ω 3W)**| DO NOT connect negative terminal to ground! |

---

## 7. SSD1306 OLED (128x64) & MPU6050 IMU (I2C)

Both devices share the same I2C bus:
- **`VCC`**: 3.3V (or 5V if module has onboard 662K 3.3V LDO regulator)
- **`GND`**: Ground
- **`SDA`**: ESP32 GPIO 21
- **`SCL`**: ESP32 GPIO 22

I2C Address Map:
- SSD1306 OLED: `0x3C`
- MPU6050 IMU: `0x68` (AD0 pulled LOW)
