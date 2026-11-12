/*
 ==============================================================================
  VIBESETTER OS - Arduino Uno Motor Controller Firmware
 ==============================================================================
  Target Board: Arduino Uno (ATmega328P) / Nano
  Motor Driver: L293D Dual H-Bridge Driver (Shield or IC / Module)
  Communication: Hardware Serial / SoftwareSerial with ESP32 Master

  Overview:
    This firmware runs on the Arduino Uno as a dedicated motor slave controller.
    It receives motion commands from the ESP32 (via UART Serial), generates PWM
    signals to drive 4 DC motors through an L293D driver, and provides safety
    watchdogs to immediately halt motors if communication is interrupted.

  Wiring between ESP32 and Arduino Uno:
    ESP32 TX (GPIO 17)  ---> Arduino RX (Pin 0 or SoftwareSerial Pin 10)
                             [Note: 3.3V to 5V logic is directly readable by Arduino]
    ESP32 RX (GPIO 16)  <--- Voltage Divider (1k/2k resistors) <--- Arduino TX (Pin 1 or Pin 11)
    GND                 <---> Common Ground (MANDATORY)

  L293D Pinout Map (Standard 4-Motor Dual H-Bridge):
    - Motor Left Enable (PWM):   Pin 5 (Timer0 PWM) or Pin 9
    - Motor Left IN1:            Pin 4
    - Motor Left IN2:            Pin 2
    - Motor Right Enable (PWM):  Pin 6 (Timer0 PWM) or Pin 10
    - Motor Right IN3:           Pin 7
    - Motor Right IN4:           Pin 8
    - Status / Heartbeat LED:    Pin 13 (Built-in LED)
 ==============================================================================
*/

#include <Arduino.h>

// ============================================================================
// 1. PIN CONFIGURATION & TUNING CONSTANTS
// ============================================================================

// --- L293D MOTOR DRIVER PINS ---
// Left Motors (Front-Left & Rear-Left wired in parallel)
const uint8_t PIN_ENABLE_LEFT   = 5;   // PWM Speed (0-255)
const uint8_t PIN_LEFT_IN1      = 4;   // Direction In 1
const uint8_t PIN_LEFT_IN2      = 2;   // Direction In 2

// Right Motors (Front-Right & Rear-Right wired in parallel)
const uint8_t PIN_ENABLE_RIGHT  = 6;   // PWM Speed (0-255)
const uint8_t PIN_RIGHT_IN3     = 7;   // Direction In 3
const uint8_t PIN_RIGHT_IN4     = 8;   // Direction In 4

// Status Indicator
const uint8_t PIN_LED_HEARTBEAT = 13;  // Arduino Onboard LED

// Safety Watchdog
const unsigned long WATCHDOG_TIMEOUT_MS = 2500;  // Auto-stop if no command received in 2.5s
const uint8_t DEFAULT_SPEED            = 200;   // Default PWM speed (0-255)

// ============================================================================
// 2. STATE VARIABLES
// ============================================================================

enum MotorState {
  STATE_STOPPED,
  STATE_FORWARD,
  STATE_BACKWARD,
  STATE_TURN_LEFT,
  STATE_TURN_RIGHT
};

MotorState currentState       = STATE_STOPPED;
uint8_t currentSpeedLeft      = 0;
uint8_t currentSpeedRight     = 0;
unsigned long lastCommandTime = 0;
unsigned long moveEndTime     = 0;     // For timed moves (0 = continuous until stopped)
bool timedMoveActive          = false;

// Serial Buffer
const size_t SERIAL_BUF_LEN   = 64;
char serialBuffer[SERIAL_BUF_LEN];
size_t bufferIndex            = 0;

// ============================================================================
// 3. HARDWARE CONTROL FUNCTIONS
// ============================================================================

void haltAllMotors() {
  analogWrite(PIN_ENABLE_LEFT, 0);
  analogWrite(PIN_ENABLE_RIGHT, 0);
  digitalWrite(PIN_LEFT_IN1, LOW);
  digitalWrite(PIN_LEFT_IN2, LOW);
  digitalWrite(PIN_RIGHT_IN3, LOW);
  digitalWrite(PIN_RIGHT_IN4, LOW);

  currentState        = STATE_STOPPED;
  currentSpeedLeft    = 0;
  currentSpeedRight   = 0;
  timedMoveActive     = false;
  moveEndTime         = 0;
}

void driveForward(uint8_t speed) {
  digitalWrite(PIN_LEFT_IN1, HIGH);
  digitalWrite(PIN_LEFT_IN2, LOW);
  digitalWrite(PIN_RIGHT_IN3, HIGH);
  digitalWrite(PIN_RIGHT_IN4, LOW);
  analogWrite(PIN_ENABLE_LEFT, speed);
  analogWrite(PIN_ENABLE_RIGHT, speed);

  currentState      = STATE_FORWARD;
  currentSpeedLeft  = speed;
  currentSpeedRight = speed;
}

void driveBackward(uint8_t speed) {
  digitalWrite(PIN_LEFT_IN1, LOW);
  digitalWrite(PIN_LEFT_IN2, HIGH);
  digitalWrite(PIN_RIGHT_IN3, LOW);
  digitalWrite(PIN_RIGHT_IN4, HIGH);
  analogWrite(PIN_ENABLE_LEFT, speed);
  analogWrite(PIN_ENABLE_RIGHT, speed);

  currentState      = STATE_BACKWARD;
  currentSpeedLeft  = speed;
  currentSpeedRight = speed;
}

void pivotLeft(uint8_t speed) {
  // Left wheels backward, right wheels forward
  digitalWrite(PIN_LEFT_IN1, LOW);
  digitalWrite(PIN_LEFT_IN2, HIGH);
  digitalWrite(PIN_RIGHT_IN3, HIGH);
  digitalWrite(PIN_RIGHT_IN4, LOW);
  analogWrite(PIN_ENABLE_LEFT, speed);
  analogWrite(PIN_ENABLE_RIGHT, speed);

  currentState      = STATE_TURN_LEFT;
  currentSpeedLeft  = speed;
  currentSpeedRight = speed;
}

void pivotRight(uint8_t speed) {
  // Left wheels forward, right wheels backward
  digitalWrite(PIN_LEFT_IN1, HIGH);
  digitalWrite(PIN_LEFT_IN2, LOW);
  digitalWrite(PIN_RIGHT_IN3, LOW);
  digitalWrite(PIN_RIGHT_IN4, HIGH);
  analogWrite(PIN_ENABLE_LEFT, speed);
  analogWrite(PIN_ENABLE_RIGHT, speed);

  currentState      = STATE_TURN_RIGHT;
  currentSpeedLeft  = speed;
  currentSpeedRight = speed;
}

// ============================================================================
// 4. COMMAND PARSER
// ============================================================================

void printStatus() {
  Serial.print(F("{\"state\":\""));
  switch (currentState) {
    case STATE_FORWARD:    Serial.print(F("FORWARD")); break;
    case STATE_BACKWARD:   Serial.print(F("BACKWARD")); break;
    case STATE_TURN_LEFT:  Serial.print(F("LEFT")); break;
    case STATE_TURN_RIGHT: Serial.print(F("RIGHT")); break;
    default:               Serial.print(F("STOPPED")); break;
  }
  Serial.print(F("\",\"left_pwm\":"));
  Serial.print(currentSpeedLeft);
  Serial.print(F(",\"right_pwm\":"));
  Serial.print(currentSpeedRight);
  Serial.print(F(",\"uptime_s\":"));
  Serial.print(millis() / 1000);
  Serial.println(F("}"));
}

void processCommand(const char* cmdLine) {
  lastCommandTime = millis();

  // Parse command token and optional parameters
  // Examples:
  //   F 200 1500    (Forward at PWM 200 for 1500ms)
  //   B 180         (Backward at PWM 180 continuous)
  //   L 220 500     (Pivot left at PWM 220 for 500ms)
  //   R 220 500     (Pivot right at PWM 220 for 500ms)
  //   S             (Immediate Emergency STOP)
  //   STATUS        (Return JSON telemetry)
  //   PING          (Return PONG)

  char cmd = toupper(cmdLine[0]);
  int speed = DEFAULT_SPEED;
  unsigned long duration = 0;

  // Check for multi-character commands
  if (strncmp(cmdLine, "STATUS", 6) == 0 || strncmp(cmdLine, "status", 6) == 0) {
    printStatus();
    return;
  }
  if (strncmp(cmdLine, "PING", 4) == 0 || strncmp(cmdLine, "ping", 4) == 0) {
    Serial.println(F("PONG"));
    return;
  }
  if (cmd == 'S') {
    haltAllMotors();
    Serial.println(F("OK STOP"));
    return;
  }

  // Parse speed and duration if present
  int parsed = sscanf(cmdLine + 1, "%d %lu", &speed, &duration);
  if (parsed < 1 || speed <= 0) {
    speed = DEFAULT_SPEED;
  }
  if (speed > 255) speed = 255;

  if (parsed >= 2 && duration > 0) {
    timedMoveActive = true;
    moveEndTime = millis() + duration;
  } else {
    timedMoveActive = false;
    moveEndTime = 0;
  }

  switch (cmd) {
    case 'F':
      driveForward(speed);
      Serial.print(F("OK F "));
      Serial.println(speed);
      break;

    case 'B':
      driveBackward(speed);
      Serial.print(F("OK B "));
      Serial.println(speed);
      break;

    case 'L':
      pivotLeft(speed);
      Serial.print(F("OK L "));
      Serial.println(speed);
      break;

    case 'R':
      pivotRight(speed);
      Serial.print(F("OK R "));
      Serial.println(speed);
      break;

    default:
      Serial.print(F("ERR UNKNOWN_CMD: "));
      Serial.println(cmdLine);
      break;
  }
}

// ============================================================================
// 5. ARDUINO SETUP & LOOP
// ============================================================================

void setup() {
  // Initialize Serial for ESP32 UART communication
  Serial.begin(115200);

  // Configure Motor Pins
  pinMode(PIN_ENABLE_LEFT, OUTPUT);
  pinMode(PIN_LEFT_IN1, OUTPUT);
  pinMode(PIN_LEFT_IN2, OUTPUT);

  pinMode(PIN_ENABLE_RIGHT, OUTPUT);
  pinMode(PIN_RIGHT_IN3, OUTPUT);
  pinMode(PIN_RIGHT_IN4, OUTPUT);

  pinMode(PIN_LED_HEARTBEAT, OUTPUT);

  // Fail-Safe: Force all motors to STOP on boot
  haltAllMotors();

  lastCommandTime = millis();
  Serial.println(F("VIBESETTER_ARDUINO_MOTOR_READY"));
}

void loop() {
  unsigned long now = millis();

  // 1. Read Incoming Serial Characters from ESP32
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\r') continue; // Ignore CR

    if (c == '\n') {
      if (bufferIndex > 0) {
        serialBuffer[bufferIndex] = '\0';
        processCommand(serialBuffer);
        bufferIndex = 0;
      }
    } else {
      if (bufferIndex < SERIAL_BUF_LEN - 1) {
        serialBuffer[bufferIndex++] = c;
      }
    }
  }

  // 2. Timed Move Expiration Check
  if (timedMoveActive && now >= moveEndTime) {
    haltAllMotors();
    Serial.println(F("OK MOVE_COMPLETE"));
  }

  // 3. Safety Watchdog: Auto-Stop if ESP32 communication is lost
  if (currentState != STATE_STOPPED && (now - lastCommandTime > WATCHDOG_TIMEOUT_MS)) {
    haltAllMotors();
    Serial.println(F("WARN WATCHDOG_TIMEOUT_STOP"));
  }

  // 4. Heartbeat LED Blink (Every 1 second when active, slow pulse when idle)
  bool ledState = (now / 500) % 2;
  digitalWrite(PIN_LED_HEARTBEAT, ledState);
}
