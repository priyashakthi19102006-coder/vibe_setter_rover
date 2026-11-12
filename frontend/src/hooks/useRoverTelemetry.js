/**
 * VIBESETTER OS - useRoverTelemetry Hook
 * ========================================
 * Provides reactive hardware telemetry, battery updates, real backend connectivity state,
 * and live rover controller status via WebSocket (ws://localhost:8000/ws/status)
 * with robust HTTP polling fallback and zero-crash guarantees.
 * 
 * Connection States:
 * - 'CONNECTED'
 * - 'CONNECTING'
 * - 'DISCONNECTED'
 * - 'ERROR'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRoverTelemetry, getRoverStatus } from '../services/roverService';
import { getSystemInfo, pingBackend } from '../services/systemService';
import { getCurrentMood } from '../services/moodService';
import { DEFAULT_WS_URL } from '../services/apiClient';

export const SAFE_DEFAULT_TELEMETRY = {
  battery: {
    percentage: 84,
    voltage: 12.6,
    charging: false,
    temperature: 31.5,
    estimatedMinutesRemaining: 185
  },
  movement: {
    speed: 0.0,
    maxSpeed: 3.5,
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

export const SAFE_DEFAULT_SYSTEM_INFO = {
  backendStatus: 'OFFLINE',
  protocol: 'WebSocket / FastAPI',
  ipAddress: '127.0.0.1',
  port: 8000,
  pingMs: 0,
  wifiSsid: 'VIBEROVER_CORE',
  signalDbm: -60,
  packetLossPercent: 0.0,
  osVersion: 'VIBESETTER OS v2.5-RECOVERY',
  hostName: 'VibeRover-Neural-Core',
  uptimeFormatted: '0h 0m 0s'
};

export const SAFE_DEFAULT_MOOD = {
  mood: 'IDLE',
  moodTitle: 'Ambient Standby',
  subtitle: 'UI Running in Connection Recovery Mode',
  energy: 50,
  valence: 75,
  focus: 60,
  auraColor: '#a855f7',
  activeExpression: 'IDLE'
};

export function useRoverTelemetry(pollIntervalMs = 2500) {
  const [telemetry, setTelemetry] = useState(SAFE_DEFAULT_TELEMETRY);
  const [systemInfo, setSystemInfo] = useState(SAFE_DEFAULT_SYSTEM_INFO);
  const [mood, setMood] = useState(SAFE_DEFAULT_MOOD);
  const [roverLiveStatus, setRoverLiveStatus] = useState({
    rover_state: 'DISCONNECTED',
    current_command: 'NONE (OFFLINE)',
    last_command: 'NONE',
    last_command_timestamp: 'N/A',
    confirmation_message: 'Safety Lock: Rover disconnected. Controls locked.'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING'); // 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR'
  const [pingLatency, setPingLatency] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);
  const [isBackendOffline, setIsBackendOffline] = useState(false);
  
  const isMounted = useRef(true);
  const reconnectAttempts = useRef(0);

  // 1. HTTP Polling Fallback & Initial Fetch
  const fetchAll = useCallback(async () => {
    try {
      const pingRes = await pingBackend();

      if (!isMounted.current) return;

      if (!pingRes.success) {
        setIsConnected(false);
        setConnectionStatus('DISCONNECTED');
        setIsBackendOffline(true);
        setPingLatency(null);
        setError('Backend Offline — UI Running in Connection Recovery Mode');
        
        // Load safe telemetry fallback so UI never receives null
        const telemData = await getRoverTelemetry().catch(() => SAFE_DEFAULT_TELEMETRY);
        if (isMounted.current) {
          setTelemetry(telemData || SAFE_DEFAULT_TELEMETRY);
          setSystemInfo(prev => ({
            ...prev,
            backendStatus: 'OFFLINE',
            pingMs: 0
          }));
          setRoverLiveStatus({
            rover_state: 'DISCONNECTED',
            current_command: 'STANDBY (BACKEND OFFLINE)',
            last_command: 'NONE',
            last_command_timestamp: new Date().toLocaleTimeString(),
            confirmation_message: 'Backend Offline — UI Running in Connection Recovery Mode'
          });
        }
        return;
      }

      // Backend is online
      setIsConnected(true);
      setConnectionStatus('CONNECTED');
      setIsBackendOffline(false);
      setPingLatency(pingRes.latencyMs);
      setError(null);

      const [telemData, sysData, moodData, statusData] = await Promise.all([
        getRoverTelemetry().catch(() => SAFE_DEFAULT_TELEMETRY),
        getSystemInfo().catch(() => SAFE_DEFAULT_SYSTEM_INFO),
        getCurrentMood().catch(() => SAFE_DEFAULT_MOOD),
        getRoverStatus().catch(() => null)
      ]);

      if (!isMounted.current) return;

      if (telemData) setTelemetry(telemData);
      if (sysData) setSystemInfo(sysData);
      if (moodData) {
        setMood({
          ...SAFE_DEFAULT_MOOD,
          ...moodData,
          moodTitle: moodData.title || moodData.moodTitle || moodData.mood || 'Ambient Standby',
          auraColor: moodData.auraColor || '#a855f7'
        });
      }
      if (statusData) {
        setRoverLiveStatus(statusData);
      }
      setLastUpdated(new Date());
    } catch (err) {
      if (!isMounted.current) return;
      console.warn('[useRoverTelemetry] Telemetry poll notice:', err.message);
      setIsConnected(false);
      setConnectionStatus('ERROR');
      setIsBackendOffline(true);
      setError('Backend Offline — UI Running in Connection Recovery Mode');
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchAll();

    const interval = setInterval(fetchAll, pollIntervalMs);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchAll, pollIntervalMs]);

  // 2. Real-Time WebSocket Telemetry Stream (ws://localhost:8000/ws/status)
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isSubscribed = true;

    function connectWs() {
      try {
        const wsUrl = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL;
        setConnectionStatus(prev => prev === 'CONNECTED' ? 'CONNECTED' : 'CONNECTING');
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isSubscribed) return;
          reconnectAttempts.current = 0;
          setIsConnected(true);
          setConnectionStatus('CONNECTED');
          setIsBackendOffline(false);
          setError(null);
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            setRoverLiveStatus(data);
            // Receiving frames from WebSocket confirms backend connectivity
            setIsConnected(true);
            setIsBackendOffline(false);
            setConnectionStatus('CONNECTED');
            setLastUpdated(new Date());
          } catch {
            // Heartbeat frame
          }
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          reconnectAttempts.current += 1;
          const delay = Math.min(10000, 2000 + reconnectAttempts.current * 1000);
          setConnectionStatus('DISCONNECTED');
          reconnectTimeout = setTimeout(connectWs, delay);
        };

        ws.onerror = () => {
          if (!isSubscribed) return;
          setConnectionStatus('ERROR');
          if (ws) ws.close();
        };
      } catch (err) {
        if (!isSubscribed) return;
        setConnectionStatus('ERROR');
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    }

    connectWs();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const refresh = useCallback(() => {
    return fetchAll();
  }, [fetchAll]);

  return {
    telemetry,
    systemInfo,
    mood,
    roverLiveStatus,
    isConnected,
    connectionStatus,
    isBackendOffline,
    pingLatency,
    lastUpdated,
    error,
    refresh
  };
}

export default useRoverTelemetry;
