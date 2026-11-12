/**
 * VIBESETTER OS - useRoverControl Hook
 * 
 * Coordinates discrete physical rover navigation (distance move, rotation turn),
 * emergency braking, distance configuration, and real backend response confirmations.
 * 
 * SAFETY PRINCIPLES:
 * - Movement commands strictly require active connection.
 * - STOP is always immediately available.
 * - Does NOT fake successful movement on network/hardware failure.
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  moveRover, 
  turnRover, 
  stopRover, 
  sendDriveCommand, 
  setSpeedMode, 
  setRoverLighting 
} from '../services/roverService';

export function useRoverControl(isConnected = false, onRefreshStatus = null) {
  // Distance selection state (10, 25, 50, 100, or custom)
  const [distancePreset, setDistancePreset] = useState(50); // 10 | 25 | 50 | 100 | 'custom'
  const [customDistanceCm, setCustomDistanceCm] = useState(75);

  // Command execution state
  const [isDispatching, setIsDispatching] = useState(false);
  const [isBraking, setIsBraking] = useState(false);
  const [lastBackendResponse, setLastBackendResponse] = useState(null);
  const [commandError, setCommandError] = useState(null);

  // Legacy & peripheral controls
  const [activeMode, setActiveMode] = useState('sport');
  const [headlights, setHeadlights] = useState(true);
  const [underglow, setUnderglow] = useState(true);
  const [lastCommand, setLastCommand] = useState({ linear: 0, angular: 0 });

  // Effective distance in cm
  const effectiveDistanceCm = distancePreset === 'custom' 
    ? Math.max(1, Math.min(1000, Number(customDistanceCm) || 50))
    : Number(distancePreset);

  /**
   * Execute Discrete Distance Move (POST /api/rover/move)
   * @param {'forward' | 'backward' | 'left' | 'right'} direction
   * @param {number} distanceOverride - optional distance override
   */
  const executeMove = useCallback(async (direction, distanceOverride = null) => {
    if (!isConnected) {
      setCommandError('SAFETY REJECTION: Rover is disconnected. Movement controls locked.');
      return;
    }

    const dist = distanceOverride !== null ? distanceOverride : effectiveDistanceCm;
    setIsDispatching(true);
    setCommandError(null);

    try {
      const response = await moveRover({ direction, distance_cm: dist });
      setLastBackendResponse(response);
      if (onRefreshStatus) onRefreshStatus();
      return response;
    } catch (err) {
      console.error('[useRoverControl] Move failed:', err);
      // DO NOT simulate movement!
      setCommandError(`Hardware error: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  }, [isConnected, effectiveDistanceCm, onRefreshStatus]);

  /**
   * Execute Discrete Angle Rotation (POST /api/rover/turn)
   * @param {'left' | 'right'} direction
   * @param {number} angle - 45 | 90 | any angle
   */
  const executeTurn = useCallback(async (direction, angle) => {
    if (!isConnected) {
      setCommandError('SAFETY REJECTION: Rover is disconnected. Rotation controls locked.');
      return;
    }

    setIsDispatching(true);
    setCommandError(null);

    try {
      const response = await turnRover({ direction, angle });
      setLastBackendResponse(response);
      if (onRefreshStatus) onRefreshStatus();
      return response;
    } catch (err) {
      console.error('[useRoverControl] Turn failed:', err);
      // DO NOT simulate movement!
      setCommandError(`Hardware error: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  }, [isConnected, onRefreshStatus]);

  /**
   * Emergency STOP - ALWAYS IMMEDIATELY AVAILABLE
   * Cuts off PWM motor channels immediately, even if offline.
   */
  const executeStop = useCallback(async () => {
    setIsBraking(true);
    setCommandError(null);

    try {
      const response = await stopRover();
      setLastBackendResponse(response);
      if (onRefreshStatus) onRefreshStatus();
      return response;
    } catch (err) {
      console.error('[useRoverControl] Stop failed:', err);
      setCommandError(`Emergency Stop Notice: ${err.message}`);
    } finally {
      setTimeout(() => setIsBraking(false), 800);
    }
  }, [onRefreshStatus]);

  // Peripheral controls
  const changeSpeedMode = useCallback(async (mode) => {
    setActiveMode(mode);
    try {
      await setSpeedMode(mode);
    } catch (err) {
      console.error('[useRoverControl] Failed to set speed mode:', err);
    }
  }, []);

  const toggleHeadlights = useCallback(async () => {
    const nextVal = !headlights;
    setHeadlights(nextVal);
    try {
      await setRoverLighting({ headlightsEnabled: nextVal });
    } catch (err) {
      console.error('[useRoverControl] Lighting toggle failed:', err);
    }
  }, [headlights]);

  const toggleUnderglow = useCallback(async () => {
    const nextVal = !underglow;
    setUnderglow(nextVal);
    try {
      await setRoverLighting({ underglowEnabled: nextVal });
    } catch (err) {
      console.error('[useRoverControl] Underglow toggle failed:', err);
    }
  }, [underglow]);

  // Legacy drive command for continuous gamepad/WASD
  const drive = useCallback(async (linear, angular) => {
    setLastCommand({ linear, angular });
    if (!isConnected && (linear !== 0 || angular !== 0)) return;
    try {
      await sendDriveCommand({ linear, angular, speedMode: activeMode });
    } catch (err) {
      console.error('[useRoverControl] Drive error:', err);
    }
  }, [isConnected, activeMode]);

  // Spacebar Emergency Stop global listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        executeStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeStop]);

  return {
    // Distance control
    distancePreset,
    setDistancePreset,
    customDistanceCm,
    setCustomDistanceCm,
    effectiveDistanceCm,

    // Core actions
    executeMove,
    executeTurn,
    executeStop,

    // Status
    isDispatching,
    isBraking,
    lastBackendResponse,
    commandError,
    setCommandError,

    // Legacy & peripherals
    activeMode,
    headlights,
    underglow,
    lastCommand,
    drive,
    changeSpeedMode,
    triggerEmergencyStop: executeStop,
    toggleHeadlights,
    toggleUnderglow
  };
}

export default useRoverControl;
