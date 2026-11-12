/**
 * VIBESETTER OS - System & Connection Service
 * 
 * Provides network diagnostics, Python backend healthchecks,
 * WiFi/WebSocket telemetry, and system-level configuration parameters.
 */

import { apiRequest } from './apiClient';

const DEFAULT_SYSTEM_INFO = {
  osVersion: 'VIBESETTER OS v2.4-NEON',
  build: '2026.11.BUILD-994',
  hostName: 'VibeRover-Neural-Core',
  backendStatus: 'CONNECTED',
  protocol: 'WebSocket / FastAPI 0.115',
  ipAddress: '192.168.1.144',
  port: 8000,
  pingMs: 14,
  wifiSsid: 'CYBER_CORE_5G',
  signalDbm: -42,
  packetLossPercent: 0.0,
  cpuUsagePercent: 24,
  ramUsageMb: 840,
  uptimeFormatted: '18h 42m 10s'
};

/**
 * Fetch rover network and system diagnostic stats
 * Python route: GET /api/system/info
 */
export async function getSystemInfo() {
  return apiRequest('/system/info', { method: 'GET' }, () => {
    return {
      ...DEFAULT_SYSTEM_INFO,
      pingMs: Math.floor(12 + Math.random() * 8),
      cpuUsagePercent: Math.floor(20 + Math.random() * 10),
      signalDbm: Math.floor(-45 + Math.sin(Date.now() / 3000) * 4)
    };
  });
}

/**
 * Test connectivity to the Python backend API
 * Python routes: GET /api/health (primary) or GET /api/system/ping (secondary)
 * Checks if the real backend is responding without simulating fallback.
 */
export async function pingBackend() {
  const start = performance.now();
  try {
    // Primary healthcheck endpoint
    const data = await apiRequest('/health', { method: 'GET', timeout: 2000 }, null);
    const elapsed = Math.round(performance.now() - start);
    return { success: true, latencyMs: elapsed, data };
  } catch (err) {
    try {
      // Secondary fallback ping endpoint
      const data2 = await apiRequest('/system/ping', { method: 'GET', timeout: 2000 }, null);
      const elapsed2 = Math.round(performance.now() - start);
      return { success: true, latencyMs: elapsed2, data: data2 };
    } catch (err2) {
      return { success: false, latencyMs: null, error: err.message };
    }
  }
}

/**
 * Update system level configuration
 * Python route: POST /api/system/config
 * @param {object} config - Configuration key-values
 */
export async function updateSystemConfig(config) {
  return apiRequest('/system/config', {
    method: 'POST',
    body: JSON.stringify(config)
  }, {
    status: 'success',
    appliedConfig: config,
    updatedAt: new Date().toISOString()
  });
}

export default {
  getSystemInfo,
  pingBackend,
  updateSystemConfig
};
