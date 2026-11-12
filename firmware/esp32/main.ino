/*
 ==============================================================================
  VIBESETTER OS - Physical Rover ESP32 Firmware
 ==============================================================================
  Hardware Components:
    - ESP32 DevKit (30-pin or 38-pin)
    - 4 DC Motors (Left Pair & Right Pair or 4-channel H-Bridge)
    - Motor Driver (L298N, dual TB6612FNG, or DRV8833)
    - MPU6050 6-Axis IMU (I2C: Gyroscope & Accelerometer)
    - SSD1306 OLED Display (I2C: 128x64 or 128x32)
    - Optional Wheel Encoders (Optical/Hall sensor interrupt inputs)

  Safety Features:
    - Fail-safe default: All motors forced STOP on boot
    - Watchdog auto-stop: Commands abort if timeout expires or link is dropped
    - Priority Emergency STOP: Hard cutoff on all PWM channels
    - Dual Turning: MPU6050 gyro-integrated closed-loop with timed fallback
    - Dual Movement: Encoder-ready architecture with calibrated timed fallback
 ==============================================================================
*/

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <ArduinoJson.h>

// Sensor & Display Libraries
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ============================================================================
// 1. HARDWARE PIN CONFIGURATION (CUSTOMIZE FOR YOUR BOARD & MOTOR DRIVER)
// ============================================================================

// --- MOTOR DRIVER PIN ASSIGNMENTS ---
// Left Motors (Front-Left & Rear-Left paired)
#define PIN_MOTOR_LEFT_PWM      14  // Left Motor Speed PWM (0-255)
#define PIN_MOTOR_LEFT_IN1      27  // Left Motor Direction IN1
#define PIN_MOTOR_LEFT_IN2      26  // Left Motor Direction IN2

// Right Motors (Front-Right & Rear-Right paired)
#define PIN_MOTOR_RIGHT_PWM     13  // Right Motor Speed PWM (0-255)
#define PIN_MOTOR_RIGHT_IN1     33  // Right Motor Direction IN3
#define PIN_MOTOR_RIGHT_IN2     32  // Right Motor Direction IN4

// Driver Standby Pin (Used on TB6612FNG. If using L298N, set to -1)
#define PIN_MOTOR_STBY          -1  // Set to GPIO pin or -1 if unused / tied to VCC

// --- I2C BUS (Shared between MPU6050 IMU & SSD1306 OLED) ---
#define PIN_I2C_SDA             21  // ESP32 default I2C Data
#define PIN_I2C_SCL             22  // ESP32 default I2C Clock

// --- OPTIONAL WHEEL ENCODER PINS (Hardware Interrupt Pins) ---
#define PIN_ENCODER_LEFT        34  // Left Wheel Encoder Pulse (Input Only)
#define PIN_ENCODER_RIGHT       35  // Right Wheel Encoder Pulse (Input Only)

// --- ONBOARD STATUS LED ---
#define PIN_STATUS_LED          2   // ESP32 Onboard Blue LED

// ============================================================================
// 2. NETWORK & RUNTIME CONFIGURATION
// ============================================================================

// Set to true to broadcast its own WiFi hotspot (SoftAP),
// or false to join your home/lab WiFi router.
#define USE_SOFT_AP             true

// SoftAP Credentials (Default IP: http://192.168.4.1)
const char* AP_SSID             = "VibeRover-Neural-AP";
const char* AP_PASS             = "cyberpunk2026"; // Min 8 chars

// Station Credentials (Used if USE_SOFT_AP is false)
const char* STA_SSID            = "YOUR_WIFI_SSID";
const char* STA_PASS            = "YOUR_WIFI_PASSWORD";

// Server Port (Matches FastAPI backend expectations)
const int HTTP_PORT             = 80;

// Watchdog Timeout: Auto-stop motors if a command runs longer than this (ms)
const unsigned long WATCHDOG_MAX_RUNTIME_MS = 12000;

// Communication Heartbeat Timeout: Auto-stop if no packet received within (ms)
const unsigned long HEARTBEAT_TIMEOUT_MS    = 6000;

// ============================================================================
// 3. CALIBRATION & KINEMATICS
// ============================================================================

// --- MOVEMENT MODE TOGGLE ---
// Set to true if physical optical/hall wheel encoders are installed
#define USE_ENCODERS            false

// Timed Movement Fallback (Calibrate with a ruler and stopwatch on your floor)
// Speed in cm per second at PWM_DRIVE_SPEED
const float CALIBRATED_CM_PER_SEC   = 22.0;

// Timed Turn Fallback (Used if MPU6050 is offline)
// Turn speed in degrees per second at PWM_TURN_SPEED
const float CALIBRATED_DEG_PER_SEC  = 160.0;

// Encoder Odometry Parameters (Used when USE_ENCODERS is true)
const float WHEEL_DIAMETER_CM       = 6.5;     // Typical robot chassis wheel
const int   ENCODER_PULSES_PER_REV  = 20;      // 20-slot encoder disc
// Ticks per cm = Pulses / (PI * Diameter)
const float TICKS_PER_CM            = ENCODER_PULSES_PER_REV / (3.14159 * WHEEL_DIAMETER_CM);

// Motor PWM speeds (0 to 255)
const int PWM_DRIVE_SPEED           = 210;
const int PWM_TURN_SPEED            = 190;
const int PWM_MIN_START_SPEED       = 140;     // Overcomes gearbox static friction

// MPU6050 Heading Tolerance
const float HEADING_TOLERANCE_DEG   = 2.5;

// ============================================================================
// 4. HARDWARE OBJECTS & SYSTEM STATE
// ============================================================================

WebServer server(HTTP_PORT);

// OLED Display (128x64 I2C, Address 0x3C or 0x3D)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
bool oledAvailable = false;

// MPU6050 IMU
Adafruit_MPU6050 mpu;
bool mpuAvailable = false;
float gyroZ_offset = 0.0;
float currentYawDeg = 0.0;
unsigned long lastGyroTimeUs = 0;

// Wheel Encoders (Volatile for ISRs)
volatile long leftTicks = 0;
volatile long rightTicks = 0;

// Rover Operating States: "IDLE", "MOVING", "TURNING", "STOPPED", "ERROR"
String roverState       = "STOPPED";
String currentCommand   = "NONE";
String lastErrorState   = "NONE";
unsigned long commandStartTime = 0;
unsigned long commandExpectedDuration = 0;
bool isExecutingCommand = false;
unsigned long lastActiveHeartbeat = 0;

// ============================================================================
// 5. ENCODER INTERRUPT SERVICE ROUTINES (ISRs)
// ============================================================================

void IRAM_ATTR leftEncoderISR() {
  leftTicks++;
}

void IRAM_ATTR rightEncoderISR() {
  rightTicks++;
}

void resetEncoders() {
  noInterrupts();
  leftTicks = 0;
  rightTicks = 0;
  interrupts();
}

// ============================================================================
// 6. MOTOR DRIVER CONTROL LAYER
// ============================================================================

void initMotors() {
  pinMode(PIN_MOTOR_LEFT_PWM, OUTPUT);
  pinMode(PIN_MOTOR_LEFT_IN1, OUTPUT);
  pinMode(PIN_MOTOR_LEFT_IN2, OUTPUT);

  pinMode(PIN_MOTOR_RIGHT_PWM, OUTPUT);
  pinMode(PIN_MOTOR_RIGHT_IN1, OUTPUT);
  pinMode(PIN_MOTOR_RIGHT_IN2, OUTPUT);

  if (PIN_MOTOR_STBY >= 0) {
    pinMode(PIN_MOTOR_STBY, OUTPUT);
    digitalWrite(PIN_MOTOR_STBY, HIGH); // Enable driver
  }

  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Safety: Ensure all motor outputs are LOW by default
  stopAllMotors();
}

void stopAllMotors() {
  // Left side hard stop
  digitalWrite(PIN_MOTOR_LEFT_IN1, LOW);
  digitalWrite(PIN_MOTOR_LEFT_IN2, LOW);
  analogWrite(PIN_MOTOR_LEFT_PWM, 0);

  // Right side hard stop
  digitalWrite(PIN_MOTOR_RIGHT_IN1, LOW);
  digitalWrite(PIN_MOTOR_RIGHT_IN2, LOW);
  analogWrite(PIN_MOTOR_RIGHT_PWM, 0);

  roverState = "STOPPED";
  isExecutingCommand = false;
  digitalWrite(PIN_STATUS_LED, LOW);
}

void setMotorsForward(int pwmLeft, int pwmRight) {
  digitalWrite(PIN_MOTOR_LEFT_IN1, HIGH);
  digitalWrite(PIN_MOTOR_LEFT_IN2, LOW);
  analogWrite(PIN_MOTOR_LEFT_PWM, pwmLeft);

  digitalWrite(PIN_MOTOR_RIGHT_IN1, HIGH);
  digitalWrite(PIN_MOTOR_RIGHT_IN2, LOW);
  analogWrite(PIN_MOTOR_RIGHT_PWM, pwmRight);

  roverState = "MOVING";
  digitalWrite(PIN_STATUS_LED, HIGH);
}

void setMotorsBackward(int pwmLeft, int pwmRight) {
  digitalWrite(PIN_MOTOR_LEFT_IN1, LOW);
  digitalWrite(PIN_MOTOR_LEFT_IN2, HIGH);
  analogWrite(PIN_MOTOR_LEFT_PWM, pwmLeft);

  digitalWrite(PIN_MOTOR_RIGHT_IN1, LOW);
  digitalWrite(PIN_MOTOR_RIGHT_IN2, HIGH);
  analogWrite(PIN_MOTOR_RIGHT_PWM, pwmRight);

  roverState = "MOVING";
  digitalWrite(PIN_STATUS_LED, HIGH);
}

void setMotorsPivotLeft(int pwm) {
  // Left motors backward, Right motors forward
  digitalWrite(PIN_MOTOR_LEFT_IN1, LOW);
  digitalWrite(PIN_MOTOR_LEFT_IN2, HIGH);
  analogWrite(PIN_MOTOR_LEFT_PWM, pwm);

  digitalWrite(PIN_MOTOR_RIGHT_IN1, HIGH);
  digitalWrite(PIN_MOTOR_RIGHT_IN2, LOW);
  analogWrite(PIN_MOTOR_RIGHT_PWM, pwm);

  roverState = "TURNING";
  digitalWrite(PIN_STATUS_LED, HIGH);
}

void setMotorsPivotRight(int pwm) {
  // Left motors forward, Right motors backward
  digitalWrite(PIN_MOTOR_LEFT_IN1, HIGH);
  digitalWrite(PIN_MOTOR_LEFT_IN2, LOW);
  analogWrite(PIN_MOTOR_LEFT_PWM, pwm);

  digitalWrite(PIN_MOTOR_RIGHT_IN1, LOW);
  digitalWrite(PIN_MOTOR_RIGHT_IN2, HIGH);
  analogWrite(PIN_MOTOR_RIGHT_PWM, pwm);

  roverState = "TURNING";
  digitalWrite(PIN_STATUS_LED, HIGH);
}

// ============================================================================
// 7. MPU6050 IMU YAW INTEGRATION & CALIBRATION
// ============================================================================

void calibrateMPU6050() {
  if (!mpuAvailable) return;
  Serial.println("[MPU6050] Calibrating gyroscope zero-rate offset. Keep rover STILL...");
  updateOLED("CALIBRATING IMU", "Keep rover still");

  float sumZ = 0.0;
  const int SAMPLES = 250;
  for (int i = 0; i < SAMPLES; i++) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    sumZ += g.gyro.z; // rad/s
    delay(5);
  }
  gyroZ_offset = sumZ / SAMPLES;
  Serial.print("[MPU6050] Gyro Z offset: ");
  Serial.print(gyroZ_offset, 5);
  Serial.println(" rad/s");

  currentYawDeg = 0.0;
  lastGyroTimeUs = micros();
}

void updateIMUYaw() {
  if (!mpuAvailable) return;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  unsigned long nowUs = micros();
  float dt = (nowUs - lastGyroTimeUs) / 1000000.0;
  lastGyroTimeUs = nowUs;

  // Protect against micros() wrap or long gaps
  if (dt <= 0.0 || dt > 0.5) dt = 0.01;

  // Filter out tiny drift noise
  float rawRateZ = g.gyro.z - gyroZ_offset;
  if (abs(rawRateZ) < 0.015) rawRateZ = 0.0;

  // Convert rad/s to deg/s and integrate yaw
  float degRateZ = rawRateZ * (180.0 / 3.14159);
  currentYawDeg += degRateZ * dt;
}

// ============================================================================
// 8. OLED DISPLAY UI & ANIMATED ROBOT EYES ARCHITECTURE
// ============================================================================

String currentMood = "IDLE";
unsigned long lastOledFrameMs = 0;
unsigned long lastBlinkMs = 0;
unsigned long blinkStartMs = 0;
bool isBlinking = false;
bool showStatusTextMode = false;
unsigned long statusTextExpiryMs = 0;
String statusLine1 = "";
String statusLine2 = "";

// Geometry Constants (128x64 display)
const int EYE_LEFT_X = 36;
const int EYE_RIGHT_X = 92;
const int EYE_Y = 28;
const int EYE_WIDTH = 26;
const int EYE_HEIGHT = 34;
const int EYE_RADIUS = 6;

void initOLED() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  if (oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    oledAvailable = true;
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setTextColor(SSD1306_WHITE);
    oled.setCursor(20, 20);
    oled.println("VIBESETTER OS");
    oled.setCursor(16, 36);
    oled.println("ROVER CORE v2.5");
    oled.display();
    delay(600);
  } else {
    Serial.println("[OLED] Warning: SSD1306 display not detected on 0x3C. Continuing.");
  }
}

// Temporary status notification (auto-expires back to animated eyes after 2.5s)
void updateOLED(String line1, String line2) {
  if (!oledAvailable) return;
  showStatusTextMode = true;
  statusLine1 = line1;
  statusLine2 = line2;
  statusTextExpiryMs = millis() + 2500;
}

// --- 1. REUSABLE EYE DRAWING FUNCTIONS ---

void drawIdleEyes(int eyeH = 34, int pupilOffset = 0) {
  // Capsule rounded rectangles
  oled.fillRoundRect(EYE_LEFT_X - EYE_WIDTH/2 + pupilOffset, EYE_Y - eyeH/2, EYE_WIDTH, eyeH, EYE_RADIUS, SSD1306_WHITE);
  oled.fillRoundRect(EYE_RIGHT_X - EYE_WIDTH/2 + pupilOffset, EYE_Y - eyeH/2, EYE_WIDTH, eyeH, EYE_RADIUS, SSD1306_WHITE);

  // Pupil reflections if eyes are open enough
  if (eyeH > 16) {
    oled.fillCircle(EYE_LEFT_X - 4 + pupilOffset, EYE_Y - 4, 3, SSD1306_BLACK);
    oled.fillCircle(EYE_RIGHT_X - 4 + pupilOffset, EYE_Y - 4, 3, SSD1306_BLACK);
  }
}

void drawHappyEyes() {
  // Upward curved joyful crescent arches
  oled.fillRoundRect(EYE_LEFT_X - 14, EYE_Y - 14, 28, 28, 14, SSD1306_WHITE);
  oled.fillRect(EYE_LEFT_X - 14, EYE_Y + 1, 28, 16, SSD1306_BLACK);

  oled.fillRoundRect(EYE_RIGHT_X - 14, EYE_Y - 14, 28, 28, 14, SSD1306_WHITE);
  oled.fillRect(EYE_RIGHT_X - 14, EYE_Y + 1, 28, 16, SSD1306_BLACK);

  // Joyful cheeks
  oled.drawFastHLine(EYE_LEFT_X - 8, EYE_Y + 16, 16, SSD1306_WHITE);
  oled.drawFastHLine(EYE_RIGHT_X - 8, EYE_Y + 16, 16, SSD1306_WHITE);
}

void drawAngryEyes() {
  // Sharp inward slanted combat eyes
  oled.fillRoundRect(EYE_LEFT_X - 14, EYE_Y - 14, 28, 28, 4, SSD1306_WHITE);
  oled.fillRoundRect(EYE_RIGHT_X - 14, EYE_Y - 14, 28, 28, 4, SSD1306_WHITE);

  // Inward angular cuts
  oled.fillTriangle(EYE_LEFT_X - 14, EYE_Y - 14, EYE_LEFT_X + 14, EYE_Y - 14, EYE_LEFT_X + 14, EYE_Y - 1, SSD1306_BLACK);
  oled.fillTriangle(EYE_RIGHT_X + 14, EYE_Y - 14, EYE_RIGHT_X - 14, EYE_Y - 14, EYE_RIGHT_X - 14, EYE_Y - 1, SSD1306_BLACK);
}

void drawSleepyEyes() {
  // Heavy half-closed eyelids
  oled.fillRoundRect(EYE_LEFT_X - 14, EYE_Y + 4, 28, 8, 3, SSD1306_WHITE);
  oled.fillRoundRect(EYE_RIGHT_X - 14, EYE_Y + 4, 28, 8, 3, SSD1306_WHITE);

  // Floating Zzz
  int zOffset = (millis() / 600) % 3;
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(110 + zOffset, 6 - zOffset);
  oled.print("z");
}

void drawExcitedEyes() {
  // Large circular eyes with sparkling pupils
  int pulse = (millis() / 150) % 3;
  oled.fillCircle(EYE_LEFT_X, EYE_Y, 16 + pulse, SSD1306_WHITE);
  oled.fillCircle(EYE_RIGHT_X, EYE_Y, 16 + pulse, SSD1306_WHITE);

  // Sparkle stars in pupils
  oled.fillCircle(EYE_LEFT_X - 4, EYE_Y - 4, 4, SSD1306_BLACK);
  oled.fillCircle(EYE_RIGHT_X - 4, EYE_Y - 4, 4, SSD1306_BLACK);
}

void drawSadEyes() {
  // Sloped downward outer cutouts
  oled.fillRoundRect(EYE_LEFT_X - 14, EYE_Y - 12, 28, 26, 4, SSD1306_WHITE);
  oled.fillRoundRect(EYE_RIGHT_X - 14, EYE_Y - 12, 28, 26, 4, SSD1306_WHITE);

  oled.fillTriangle(EYE_LEFT_X - 14, EYE_Y - 12, EYE_LEFT_X + 14, EYE_Y - 12, EYE_LEFT_X - 14, EYE_Y + 2, SSD1306_BLACK);
  oled.fillTriangle(EYE_RIGHT_X + 14, EYE_Y - 12, EYE_RIGHT_X - 14, EYE_Y - 12, EYE_RIGHT_X + 14, EYE_Y + 2, SSD1306_BLACK);
}

void drawListeningEyes() {
  // Wide alert circular eyes with sound wave radar rings
  oled.fillRoundRect(EYE_LEFT_X - 13, EYE_Y - 14, 26, 28, 8, SSD1306_WHITE);
  oled.fillRoundRect(EYE_RIGHT_X - 13, EYE_Y - 14, 26, 28, 8, SSD1306_WHITE);

  // Acoustic radar rings above eyes
  int waveStep = (millis() / 200) % 3;
  oled.drawCircle(EYE_LEFT_X, EYE_Y - 20, 3 + waveStep * 2, SSD1306_WHITE);
  oled.drawCircle(EYE_RIGHT_X, EYE_Y - 20, 3 + waveStep * 2, SSD1306_WHITE);
}

void drawTalkingEyes(int mouthWidth) {
  // Expressive eyes
  oled.fillRoundRect(EYE_LEFT_X - 13, EYE_Y - 14, 26, 26, 6, SSD1306_WHITE);
  oled.fillRoundRect(EYE_RIGHT_X - 13, EYE_Y - 14, 26, 26, 6, SSD1306_WHITE);

  // Animated vocal mouth bar at bottom (Y = 54)
  int mw = 12 + mouthWidth * 6;
  oled.fillRoundRect(64 - mw/2, 53, mw, 5, 2, SSD1306_WHITE);
}

// --- 2. NON-BLOCKING MILLIS ANIMATION CONTROLLERS ---

void animateBlink() {
  unsigned long now = millis();

  // Trigger new blink every 3.5 to 5 seconds
  if (!isBlinking && (now - lastBlinkMs > 3800)) {
    isBlinking = true;
    blinkStartMs = now;
  }

  if (isBlinking) {
    unsigned long elapsed = now - blinkStartMs;
    if (elapsed < 80) {
      // Closing
      int currentH = map(elapsed, 0, 80, EYE_HEIGHT, 4);
      drawIdleEyes(currentH, 0);
    } else if (elapsed < 160) {
      // Opening
      int currentH = map(elapsed, 80, 160, 4, EYE_HEIGHT);
      drawIdleEyes(currentH, 0);
    } else {
      isBlinking = false;
      lastBlinkMs = now;
      drawIdleEyes(EYE_HEIGHT, 0);
    }
  } else {
    // Subtle saccadic looking around (moves pupil left/right occasionally)
    int saccade = 0;
    int phase = (now / 1500) % 5;
    if (phase == 1) saccade = -4; // Look left
    if (phase == 3) saccade = 4;  // Look right
    drawIdleEyes(EYE_HEIGHT, saccade);
  }
}

void animateThinking() {
  unsigned long now = millis();
  // Smooth sine sweep across eye range
  int sweepOffset = ((now / 40) % 32) - 16;
  drawIdleEyes(EYE_HEIGHT - 6, sweepOffset);

  // Neural data scan line across middle
  int scanY = 16 + ((now / 35) % 24);
  oled.drawFastHLine(EYE_LEFT_X - 14, scanY, 28, SSD1306_BLACK);
  oled.drawFastHLine(EYE_RIGHT_X - 14, scanY, 28, SSD1306_BLACK);
}

void drawOLEDStatusFooter() {
  // Micro footer: Mood name & WiFi/Battery info
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(2, 56);
  oled.print(currentMood);
  oled.setCursor(80, 56);
  oled.print(USE_SOFT_AP ? "SoftAP" : "WiFi");
}

void updateEyesAnimation() {
  if (!oledAvailable) return;

  unsigned long now = millis();
  // Frame limiter: ~30 FPS (every 33ms) to keep I2C bus fast and unblocked
  if (now - lastOledFrameMs < 33) return;
  lastOledFrameMs = now;

  // If showing temporary text notification, render text card
  if (showStatusTextMode) {
    if (now > statusTextExpiryMs) {
      showStatusTextMode = false;
    } else {
      oled.clearDisplay();
      oled.setTextSize(1);
      oled.setTextColor(SSD1306_WHITE);
      oled.setCursor(0, 0);
      oled.println(">> VIBESETTER OS <<");
      oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
      oled.setCursor(0, 16);
      oled.println(statusLine1);
      oled.setCursor(0, 28);
      oled.println(statusLine2);
      oled.setCursor(0, 42);
      oled.print("STATE: ");
      oled.println(roverState);
      oled.setCursor(0, 54);
      oled.print("MOOD: ");
      oled.println(currentMood);
      oled.display();
      return;
    }
  }

  // Render animated robot eyes based on currentMood
  oled.clearDisplay();

  if (currentMood == "HAPPY") {
    drawHappyEyes();
  } else if (currentMood == "EXCITED") {
    drawExcitedEyes();
  } else if (currentMood == "SAD") {
    drawSadEyes();
  } else if (currentMood == "ANGRY") {
    drawAngryEyes();
  } else if (currentMood == "SLEEPY") {
    drawSleepyEyes();
  } else if (currentMood == "THINKING") {
    animateThinking();
  } else if (currentMood == "LISTENING") {
    drawListeningEyes();
  } else if (currentMood == "TALKING") {
    int mouthPhase = (now / 100) % 4;
    drawTalkingEyes(mouthPhase);
  } else {
    // Default IDLE with non-blocking blink & saccades
    animateBlink();
  }

  drawOLEDStatusFooter();
  oled.display();
}

// ============================================================================
// 9. HIGH-LEVEL MOTION CONTROLLER (DISTANCE & ROTATION)
// ============================================================================

/**
 * Execute discrete distance movement:
 * Mode A: Timed duration fallback
 * Mode B: Wheel encoder closed-loop targets (when USE_ENCODERS = true)
 */
bool executeDistanceMove(String direction, float distanceCm) {
  resetEncoders();
  currentCommand = "MOVE " + direction + " (" + String(distanceCm, 1) + " cm)";
  lastActiveHeartbeat = millis();

  // Mode B: Closed-Loop Wheel Encoder Architecture
  if (USE_ENCODERS) {
    long targetTicks = distanceCm * TICKS_PER_CM;
    Serial.print("[Motion] Encoder Target Ticks: ");
    Serial.println(targetTicks);

    unsigned long startMs = millis();
    unsigned long maxTimeoutMs = (distanceCm / 5.0) * 1000 + 4000; // Safe dynamic timeout

    if (direction == "forward")  setMotorsForward(PWM_DRIVE_SPEED, PWM_DRIVE_SPEED);
    else if (direction == "backward") setMotorsBackward(PWM_DRIVE_SPEED, PWM_DRIVE_SPEED);
    else if (direction == "left")     setMotorsPivotLeft(PWM_TURN_SPEED);
    else if (direction == "right")    setMotorsPivotRight(PWM_TURN_SPEED);

    while (true) {
      server.handleClient();
      updateIMUYaw();

      long avgTicks = (leftTicks + rightTicks) / 2;
      if (avgTicks >= targetTicks) break;

      // Safety timeout abort
      if (millis() - startMs > maxTimeoutMs) {
        lastErrorState = "ENCODER_TIMEOUT_ABORT";
        stopAllMotors();
        return false;
      }
      delay(2);
    }

    stopAllMotors();
    roverState = "IDLE";
    return true;
  }

  // Mode A: Calibrated Timed Movement Fallback
  unsigned long durationMs = (distanceCm / CALIBRATED_CM_PER_SEC) * 1000.0;
  if (durationMs > WATCHDOG_MAX_RUNTIME_MS) durationMs = WATCHDOG_MAX_RUNTIME_MS;

  Serial.print("[Motion] Timed Duration: ");
  Serial.print(durationMs);
  Serial.println(" ms");

  if (direction == "forward")  setMotorsForward(PWM_DRIVE_SPEED, PWM_DRIVE_SPEED);
  else if (direction == "backward") setMotorsBackward(PWM_DRIVE_SPEED, PWM_DRIVE_SPEED);
  else if (direction == "left")     setMotorsPivotLeft(PWM_TURN_SPEED);
  else if (direction == "right")    setMotorsPivotRight(PWM_TURN_SPEED);

  unsigned long startMs = millis();
  while (millis() - startMs < durationMs) {
    server.handleClient();
    updateIMUYaw();
    delay(5);
  }

  stopAllMotors();
  roverState = "IDLE";
  return true;
}

/**
 * Execute discrete rotational turn:
 * Mode A: MPU6050 Gyro Closed-Loop Integration
 * Mode B: Timed fallback (if MPU6050 is unavailable)
 */
bool executeAngleTurn(String direction, float targetAngleDeg) {
  currentCommand = "TURN " + direction + " (" + String(targetAngleDeg, 1) + " deg)";
  lastActiveHeartbeat = millis();

  // Mode A: MPU6050 Gyro Closed-Loop Turn
  if (mpuAvailable) {
    float startYaw = currentYawDeg;
    float desiredRelativeYaw = (direction == "left") ? -targetAngleDeg : targetAngleDeg;
    float targetYaw = startYaw + desiredRelativeYaw;

    Serial.print("[IMU Turn] Start: ");
    Serial.print(startYaw);
    Serial.print("° | Target: ");
    Serial.print(targetYaw);
    Serial.println("°");

    unsigned long startMs = millis();
    unsigned long turnTimeoutMs = (targetAngleDeg / 40.0) * 1000 + 3500; // Dynamic safety timeout

    if (direction == "left") {
      setMotorsPivotLeft(PWM_TURN_SPEED);
    } else {
      setMotorsPivotRight(PWM_TURN_SPEED);
    }

    while (true) {
      server.handleClient();
      updateIMUYaw();

      float angleTraveled = abs(currentYawDeg - startYaw);
      if (angleTraveled >= (targetAngleDeg - HEADING_TOLERANCE_DEG)) {
        break; // Reached target angle
      }

      // Safety timeout in case of wheel slip
      if (millis() - startMs > turnTimeoutMs) {
        Serial.println("[IMU Turn] Timeout safety stop triggered!");
        lastErrorState = "IMU_TURN_TIMEOUT";
        stopAllMotors();
        return false;
      }
      delay(3);
    }

    stopAllMotors();
    roverState = "IDLE";
    return true;
  }

  // Mode B: Calibrated Timed Fallback Turn
  unsigned long durationMs = (targetAngleDeg / CALIBRATED_DEG_PER_SEC) * 1000.0;
  Serial.print("[Timed Turn Fallback] Duration: ");
  Serial.print(durationMs);
  Serial.println(" ms");

  if (direction == "left") {
    setMotorsPivotLeft(PWM_TURN_SPEED);
  } else {
    setMotorsPivotRight(PWM_TURN_SPEED);
  }

  unsigned long startMs = millis();
  while (millis() - startMs < durationMs) {
    server.handleClient();
    delay(5);
  }

  stopAllMotors();
  roverState = "IDLE";
  return true;
}

// ============================================================================
// 10. HTTP REST API HANDLERS (FASTAPI BACKEND COMPATIBLE)
// ============================================================================

void handlePing() {
  lastActiveHeartbeat = millis();
  server.send(200, "application/json", "{\"status\":\"PONG\",\"firmware\":\"VibeSetter-ESP32-v2.5\"}");
}

void handleStatus() {
  lastActiveHeartbeat = millis();
  updateIMUYaw();

  StaticJsonDocument<384> doc;
  doc["online"]             = true;
  doc["current_command"]    = currentCommand;
  doc["motor_state"]        = roverState;
  doc["error_state"]        = lastErrorState;
  doc["yaw_deg"]            = round(currentYawDeg * 10.0) / 10.0;
  doc["imu_online"]         = mpuAvailable;
  doc["oled_online"]        = oledAvailable;
  doc["encoders_enabled"]   = USE_ENCODERS;
  doc["left_ticks"]         = leftTicks;
  doc["right_ticks"]        = rightTicks;
  doc["uptime_sec"]         = millis() / 1000;

  String jsonString;
  serializeJson(doc, jsonString);
  server.send(200, "application/json", jsonString);
}

void handleMove() {
  lastActiveHeartbeat = millis();

  if (server.method() != HTTP_POST) {
    server.send(405, "application/json", "{\"error\":\"Method Not Allowed\"}");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON format\"}");
    return;
  }

  String direction = doc["direction"] | "forward";
  float distanceCm = doc["distance_cm"] | 25.0;

  if (distanceCm <= 0 || distanceCm > 500) {
    server.send(400, "application/json", "{\"error\":\"Distance must be 1.0 to 500.0 cm\"}");
    return;
  }

  updateOLED("CMD: MOVE " + direction, String(distanceCm, 1) + " cm");

  // Execute motion
  bool ok = executeDistanceMove(direction, distanceCm);

  StaticJsonDocument<256> reply;
  reply["status"]       = ok ? "acknowledged" : "aborted";
  reply["direction"]    = direction;
  reply["distance_cm"]  = distanceCm;
  reply["motor_state"]  = roverState;
  reply["error_state"]  = lastErrorState;

  String replyStr;
  serializeJson(reply, replyStr);
  server.send(ok ? 200 : 500, "application/json", replyStr);

  updateOLED("IDLE", "Awaiting commands");
}

void handleTurn() {
  lastActiveHeartbeat = millis();

  if (server.method() != HTTP_POST) {
    server.send(405, "application/json", "{\"error\":\"Method Not Allowed\"}");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON format\"}");
    return;
  }

  String direction = doc["direction"] | "left";
  float angle = doc["angle"] | 90.0;

  if (angle <= 0 || angle > 360) {
    server.send(400, "application/json", "{\"error\":\"Angle must be 1.0 to 360.0 degrees\"}");
    return;
  }

  updateOLED("CMD: TURN " + direction, String(angle, 1) + " deg");

  // Execute rotation
  bool ok = executeAngleTurn(direction, angle);

  StaticJsonDocument<256> reply;
  reply["status"]       = ok ? "acknowledged" : "aborted";
  reply["direction"]    = direction;
  reply["angle"]        = angle;
  reply["motor_state"]  = roverState;
  reply["current_yaw"]  = currentYawDeg;
  reply["error_state"]  = lastErrorState;

  String replyStr;
  serializeJson(reply, replyStr);
  server.send(ok ? 200 : 500, "application/json", replyStr);

  updateOLED("IDLE", "Awaiting commands");
}

void handleStop() {
  // PRIORITY EMERGENCY STOP
  stopAllMotors();
  currentCommand = "EMERGENCY STOP";
  lastErrorState = "NONE";
  lastActiveHeartbeat = millis();

  updateOLED("EMERGENCY STOP", "Motors Killed");
  server.send(200, "application/json", "{\"status\":\"STOPPED\",\"emergency_stop\":true,\"motor_state\":\"STOPPED\"}");
  Serial.println("[Safety] Hard emergency stop acknowledged.");
}

void handleMood() {
  lastActiveHeartbeat = millis();

  if (server.method() != HTTP_POST) {
    server.send(405, "application/json", "{\"error\":\"Method Not Allowed\"}");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON format\"}");
    return;
  }

  String newMood = doc["mood"] | doc["expression"] | "IDLE";
  newMood.toUpperCase();
  currentMood = newMood;
  showStatusTextMode = false; // Switch display immediately to eye animation

  Serial.print("[Mood Engine] Hardware OLED eyes updated to: ");
  Serial.println(currentMood);

  StaticJsonDocument<128> resDoc;
  resDoc["status"] = "success";
  resDoc["mood"] = currentMood;

  String jsonString;
  serializeJson(resDoc, jsonString);
  server.send(200, "application/json", jsonString);
}

// ============================================================================
// 11. INITIALIZATION & SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println("\n========================================================");
  Serial.println("  VIBESETTER OS - Physical Rover ESP32 Firmware v2.5");
  Serial.println("========================================================");

  // 1. Initialize Motors (Default to 0 PWM / Off)
  initMotors();
  Serial.println("[Hardware] Motors initialized in STOPPED state.");

  // 2. Initialize OLED Display
  initOLED();

  // 3. Initialize MPU6050 IMU
  if (mpu.begin()) {
    mpuAvailable = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("[Hardware] MPU6050 IMU initialized on I2C.");
    calibrateMPU6050();
  } else {
    mpuAvailable = false;
    Serial.println("[Hardware] Warning: MPU6050 not detected. Using timed turn fallback.");
  }

  // 4. Initialize Wheel Encoders (Optional)
  if (USE_ENCODERS) {
    pinMode(PIN_ENCODER_LEFT, INPUT_PULLUP);
    pinMode(PIN_ENCODER_RIGHT, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_ENCODER_LEFT), leftEncoderISR, RISING);
    attachInterrupt(digitalPinToInterrupt(PIN_ENCODER_RIGHT), rightEncoderISR, RISING);
    Serial.println("[Hardware] Encoder interrupts attached (Mode B Active).");
  } else {
    Serial.println("[Hardware] Encoders disabled. Using calibrated timed fallback (Mode A).");
  }

  // 5. Connect WiFi
  if (USE_SOFT_AP) {
    WiFi.softAP(AP_SSID, AP_PASS);
    IPAddress myIP = WiFi.softAPIP();
    Serial.print("[WiFi] SoftAP Online: ");
    Serial.println(AP_SSID);
    Serial.print("[WiFi] IP Address: ");
    Serial.println(myIP); // http://192.168.4.1
    updateOLED("AP: " + String(AP_SSID), "IP: " + myIP.toString());
  } else {
    WiFi.begin(STA_SSID, STA_PASS);
    Serial.print("[WiFi] Connecting to: ");
    Serial.println(STA_SSID);
    updateOLED("CONNECTING WIFI", String(STA_SSID));

    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 25) {
      delay(400);
      Serial.print(".");
      retries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[WiFi] Connected successfully!");
      Serial.print("[WiFi] IP Address: ");
      Serial.println(WiFi.localIP());
      updateOLED("WIFI CONNECTED", WiFi.localIP().toString());
    } else {
      Serial.println("\n[WiFi] Failed to connect to Station. Starting fallback SoftAP.");
      WiFi.softAP(AP_SSID, AP_PASS);
      updateOLED("AP FALLBACK", WiFi.softAPIP().toString());
    }
  }

  // 6. Register HTTP REST Endpoints
  server.on("/ping", HTTP_GET, handlePing);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/move", HTTP_POST, handleMove);
  server.on("/turn", HTTP_POST, handleTurn);
  server.on("/stop", HTTP_POST, handleStop);
  server.on("/mood", HTTP_POST, handleMood);
  server.on("/expression", HTTP_POST, handleMood);

  server.begin();
  Serial.println("[WebServer] HTTP REST server listening on port 80.");
  Serial.println("[System] Ready for FastAPI backend commands.");
  roverState = "IDLE";
  lastActiveHeartbeat = millis();
}

// ============================================================================
// 12. MAIN LOOP & SAFETY WATCHDOG
// ============================================================================

void loop() {
  // Handle HTTP REST requests from FastAPI backend
  server.handleClient();

  // Continuously update IMU Gyro Yaw integration
  updateIMUYaw();

  // Render animated robot eyes on OLED (30 FPS non-blocking millis timing)
  updateEyesAnimation();

  // --- SAFETY WATCHDOG ---
  // If rover is in MOVING or TURNING state but communication drops or duration runs runaway:
  if (roverState == "MOVING" || roverState == "TURNING") {
    if (millis() - lastActiveHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      Serial.println("[Safety Watchdog] Lost heartbeat communication! Stopping motors.");
      stopAllMotors();
      lastErrorState = "WATCHDOG_HEARTBEAT_TIMEOUT";
      updateOLED("SAFETY TIMEOUT", "Lost Connection");
    }
  }
}
