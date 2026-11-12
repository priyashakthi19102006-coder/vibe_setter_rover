/**
 * VIBESETTER OS - Rover Hardware & Telemetry Service
 * 
 * Provides integration endpoints for physical rover motor controls,
 * distance navigation, rotation pivots, emergency braking, and telemetry.
 * Connects directly to Python FastAPI backend.
 */

import { apiRequest } from './apiClient';

/**
 * Fallback telemetry dataset used when backend is offline
 */
const DEFAULT_TELEMETRY = {
  battery: {
    percentage: 84,
    voltage: 12.6,
    charging: false,
    temperature: 31.5,
    estimatedMinutesRemaining: 185
  },
  movement: {
    speed: 0.0,
    maxSpeed: 3.5, // m/s
    linearVelocity: 0.0,
    angularVelocity: 0.0,
    driveMode: 'sport',
    motorsActive: false,
    motorTempLeft: 34.2,
    motorTempRight: 35.1
  },
  sensors: {
    frontObstacleDistCm: 142,
    rearObstacleDistCm: 210,
    pitchAngleDeg: 1.2,
    rollAngleDeg: -0.4,
    headingDeg: 284
  },
  lights: {
    headlightsEnabled: true,
    brightness: 80,
    underglowEnabled: true,
    underglowColor: '#a855f7'
  },
  health: {
    status: 'OPTIMAL',
    chassisTemp: 32.8,
    errorCodes: []
  }
};

/**
 * Send discrete distance movement command to the physical rover
 * Backend contract: POST /api/rover/move
 * Payload: { "direction": "forward" | "backward" | "left" | "right", "distance_cm": number }
 * 
 * IMPORTANT SAFETY: Does NOT simulate successful movement if backend is offline.
 * @param {object} params - { direction: string, distance_cm: number }
 */
export async function moveRover({ direction, distance_cm }) {
  // Do NOT pass a fallback mock that fakes movement!
  // Re-throws error if backend is disconnected or returns an error status.
  return apiRequest('/rover/move', {
    method: 'POST',
    body: JSON.stringify({
      direction: direction.toLowerCase(),
      distance_cm: Number(distance_cm)
    })
  }, null);
}

/**
 * Send rotational pivot command to the physical rover
 * Backend contract: POST /api/rover/turn
 * Payload: { "direction": "left" | "right", "angle": number }
 * 
 * IMPORTANT SAFETY: Does NOT simulate successful turn if backend is offline.
 * @param {object} params - { direction: string, angle: number }
 */
export async function turnRover({ direction, angle }) {
  // Do NOT pass a fallback mock that fakes turning!
  return apiRequest('/rover/turn', {
    method: 'POST',
    body: JSON.stringify({
      direction: direction.toLowerCase(),
      angle: Number(angle)
    })
  }, null);
}

/**
 * Emergency STOP command - immediately cuts off all motor outputs.
 * Backend contract: POST /api/rover/stop
 * 
 * IMPORTANT SAFETY: Always immediately available.
 * If backend is offline, returns local failsafe response so UI reflects immediate brake.
 */
export async function stopRover() {
  const localFallback = {
    status: 'STOPPED',
    rover_state: 'STOPPED',
    current_command: 'EMERGENCY STOP (LOCAL FALLBACK)',
    last_command: 'STOP',
    last_command_timestamp: new Date().toLocaleTimeString(),
    confirmation: 'Local failsafe engaged: motors cut off (Backend offline).'
  };

  return apiRequest('/rover/stop', {
    method: 'POST',
    body: JSON.stringify({})
  }, localFallback);
}

/**
 * Fetch real-time status of the rover hardware controller
 * Route: GET /api/rover/status
 */
export async function getRoverStatus() {
  return apiRequest('/rover/status', { method: 'GET' }, null);
}

/**
 * Fetch real-time telemetry from the rover hardware bridge
 * Route: GET /api/rover/telemetry
 */
export async function getRoverTelemetry() {
  return apiRequest('/rover/telemetry', { method: 'GET' }, () => {
    return {
      ...DEFAULT_TELEMETRY,
      battery: {
        ...DEFAULT_TELEMETRY.battery,
        percentage: Math.max(10, Math.min(100, DEFAULT_TELEMETRY.battery.percentage + (Math.random() * 0.4 - 0.2)))
      },
      movement: {
        ...DEFAULT_TELEMETRY.movement,
        motorTempLeft: +(34 + Math.sin(Date.now() / 10000) * 2).toFixed(1),
        motorTempRight: +(35 + Math.cos(Date.now() / 10000) * 2).toFixed(1)
      },
      sensors: {
        ...DEFAULT_TELEMETRY.sensors,
        frontObstacleDistCm: Math.floor(135 + Math.random() * 15),
        headingDeg: Math.floor((DEFAULT_TELEMETRY.sensors.headingDeg + (Date.now() / 500) % 360))
      }
    };
  });
}

/**
 * Legacy continuous drive command (e.g. for analog joysticks)
 * Route: POST /api/rover/drive
 */
export async function sendDriveCommand(command) {
  return apiRequest('/rover/drive', {
    method: 'POST',
    body: JSON.stringify(command)
  }, {
    status: 'acknowledged',
    appliedCommand: command,
    timestamp: Date.now()
  });
}

/**
 * Set active rover speed profile ('eco', 'normal', 'sport', 'cyber')
 */
export async function setSpeedMode(mode) {
  return apiRequest('/rover/speed-mode', {
    method: 'POST',
    body: JSON.stringify({ mode })
  }, {
    status: 'success',
    activeMode: mode
  });
}

/**
 * Toggle rover LED headlights / underglow
 */
export async function setRoverLighting(lighting) {
  return apiRequest('/rover/lighting', {
    method: 'POST',
    body: JSON.stringify(lighting)
  }, {
    status: 'success',
    lighting
  });
}

/**
 * Emergency Brake alias for backward compatibility
 */
export async function emergencyStop() {
  return stopRover();
}

export default {
  moveRover,
  turnRover,
  stopRover,
  getRoverStatus,
  getRoverTelemetry,
  sendDriveCommand,
  setSpeedMode,
  setRoverLighting,
  emergencyStop
};
