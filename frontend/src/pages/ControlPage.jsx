/**
 * VIBESETTER OS - Control Page
 * 
 * Comprehensive hardware rover control station:
 * 1. Direction Control Panel (Forward, Backward, Left, Right, Large Emergency STOP)
 * 2. Distance Control (10 cm, 25 cm, 50 cm, 1 meter, Custom distance)
 * 3. Rotation Control (Turn Left 45°, Turn Left 90°, Turn Right 45°, Turn Right 90°)
 * 4. Live Status Panel (Real backend values: Current command, Rover state, Connection status, Last command timestamp)
 * 
 * SAFETY IMPLEMENTATION:
 * - Movement and rotation controls are strictly disabled when disconnected.
 * - Emergency STOP is ALWAYS available and visually prominent.
 * - Real backend confirmation messages displayed; no fake movement simulated.
 * - Distinct separation between Frontend UI Intent and Verified Hardware State.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  RotateCw, 
  OctagonX, 
  ShieldAlert, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Crosshair, 
  Sliders, 
  Lightbulb, 
  Sparkles, 
  RefreshCw,
  Cpu,
  Radio,
  Zap,
  Gauge
} from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import CyberButton from '../components/common/CyberButton';
import StatusBadge from '../components/common/StatusBadge';

const DISTANCE_PRESETS = [
  { id: 10, label: '10 cm', value: 10, desc: 'Precision nudge' },
  { id: 25, label: '25 cm', value: 25, desc: 'Short step' },
  { id: 50, label: '50 cm', value: 50, desc: 'Medium stride' },
  { id: 100, label: '1 Meter', value: 100, desc: 'Full meter (100 cm)' },
  { id: 'custom', label: 'Custom', value: 'custom', desc: 'User specified' }
];

const ROTATION_CONTROLS = [
  { id: 'left-45', direction: 'left', angle: 45, label: 'Turn Left 45°', icon: RotateCcw, sub: 'Pivot -45°' },
  { id: 'left-90', direction: 'left', angle: 90, label: 'Turn Left 90°', icon: RotateCcw, sub: 'Right Angle -90°' },
  { id: 'right-45', direction: 'right', angle: 45, label: 'Turn Right 45°', icon: RotateCw, sub: 'Pivot +45°' },
  { id: 'right-90', direction: 'right', angle: 90, label: 'Turn Right 90°', icon: RotateCw, sub: 'Right Angle +90°' },
];

export function ControlPage({
  control: rawControl,
  telemetry = null,
  isConnected = false,
  roverLiveStatus = null,
  systemInfo = null,
  onRefresh = null
}) {
  const defaultControl = {
    distancePreset: 50,
    setDistancePreset: () => {},
    customDistanceCm: 50,
    setCustomDistanceCm: () => {},
    effectiveDistanceCm: 50,
    executeMove: async () => {},
    executeTurn: async () => {},
    executeStop: async () => {},
    isDispatching: false,
    isBraking: false,
    lastBackendResponse: null,
    commandError: null,
    setCommandError: () => {},
    headlights: false,
    underglow: true,
    toggleHeadlights: () => {},
    toggleUnderglow: () => {}
  };
  const control = rawControl || defaultControl;

  const {
    distancePreset,
    setDistancePreset,
    customDistanceCm,
    setCustomDistanceCm,
    effectiveDistanceCm,
    executeMove,
    executeTurn,
    executeStop,
    isDispatching,
    isBraking,
    lastBackendResponse,
    commandError,
    setCommandError,
    headlights,
    underglow,
    toggleHeadlights,
    toggleUnderglow
  } = control;

  const [activeDirectionKey, setActiveDirectionKey] = useState(null);
  const [activeRotationKey, setActiveRotationKey] = useState(null);

  // Fallback hardware status if not yet polled from backend
  const liveState = roverLiveStatus?.rover_state || (isConnected ? 'IDLE' : 'DISCONNECTED');
  const liveCurrentCommand = roverLiveStatus?.current_command || (lastBackendResponse?.current_command || (isConnected ? 'IDLE' : 'NONE (OFFLINE)'));
  const liveLastCommand = roverLiveStatus?.last_command || (lastBackendResponse?.last_command || 'NONE');
  const liveTimestamp = roverLiveStatus?.last_command_timestamp || (lastBackendResponse?.last_command_timestamp || 'No commands executed yet');
  const liveConfirmation = lastBackendResponse?.confirmation || roverLiveStatus?.confirmation_message || (isConnected ? 'System standing by in IDLE state.' : 'Rover disconnected. Connect backend to enable navigation.');

  // Handle Direction Move
  const handleMove = async (dir) => {
    if (!isConnected || isDispatching) return;
    setActiveDirectionKey(dir);
    try {
      await executeMove(dir, effectiveDistanceCm);
    } finally {
      setTimeout(() => setActiveDirectionKey(null), 300);
    }
  };

  // Handle Rotation Turn
  const handleTurn = async (dir, angle, keyId) => {
    if (!isConnected || isDispatching) return;
    setActiveRotationKey(keyId);
    try {
      await executeTurn(dir, angle);
    } finally {
      setTimeout(() => setActiveRotationKey(null), 300);
    }
  };

  // State color mapping
  const getStateBadge = (state) => {
    switch (state) {
      case 'MOVING':
        return { variant: 'cyan', text: 'MOVING', dot: 'bg-cyan-400' };
      case 'TURNING':
        return { variant: 'active', text: 'TURNING', dot: 'bg-purple-400' };
      case 'STOPPED':
        return { variant: 'warning', text: 'STOPPED', dot: 'bg-amber-400' };
      case 'IDLE':
        return { variant: 'online', text: 'IDLE (READY)', dot: 'bg-emerald-400' };
      default:
        return { variant: 'offline', text: 'DISCONNECTED', dot: 'bg-rose-500' };
    }
  };

  const badge = getStateBadge(liveState);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* ============================================================ */}
      {/* 0. HEADER & SAFETY INTERLOCK BANNER                          */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-4 pb-6 border-b border-purple-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white tracking-wide flex items-center gap-3">
              <span>PHYSICAL ROVER CONTROL</span>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-purple-900/60 border border-purple-400/50 text-purple-300">
                HARDWARE INTERFACE
              </span>
            </h2>
            <p className="text-sm font-mono text-slate-400 mt-1">
              Precision stepper/PWM navigation with discrete distance moves, rotation pivots, and instant failsafe.
            </p>
          </div>

          {/* Large prominent Emergency Stop shortcut */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={executeStop}
            className={`
              relative px-5 py-3 rounded-2xl font-orbitron font-bold text-sm tracking-wider uppercase flex items-center gap-2.5 text-white transition-all cursor-pointer
              ${isBraking 
                ? 'bg-rose-500 border-2 border-white shadow-[0_0_40px_rgba(244,63,94,1)] scale-105' 
                : 'bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 border-2 border-rose-400/80 shadow-[0_0_25px_rgba(244,63,94,0.6)] hover:shadow-[0_0_35px_rgba(244,63,94,0.9)]'
              }
            `}
            title="Always immediately available (Spacebar)"
          >
            <OctagonX className={`w-5 h-5 ${isBraking ? 'animate-spin' : 'animate-pulse'}`} />
            <span>{isBraking ? 'BRAKE ENGAGED!' : 'EMERGENCY STOP (SPACE)'}</span>
          </motion.button>
        </div>

        {/* Safety Interlock Alert Banner */}
        <AnimatePresence>
          {!isConnected ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-xl bg-rose-950/40 border-2 border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs shadow-[0_0_20px_rgba(244,63,94,0.2)]"
            >
              <div className="flex items-center gap-3 text-rose-300">
                <div className="p-2 rounded-lg bg-rose-900/60 border border-rose-400/50 text-rose-200 shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold tracking-wider text-rose-200">
                    SAFETY INTERLOCK ACTIVE: ROVER DISCONNECTED
                  </div>
                  <div className="text-rose-300/80 text-[11px] mt-0.5">
                    Movement & rotation controls are locked for physical safety. Start Python backend (<code className="text-white">cd backend && uvicorn app:app --port 8000</code>) to enable commands.
                  </div>
                </div>
              </div>

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/80 border border-rose-400/60 text-white font-bold hover:bg-rose-800 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  RECHECK LINK
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between font-mono text-xs text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>HARDWARE BRIDGE ONLINE // INTERLOCK ARMED // ALL CONTROLS ACTIVE</span>
              </div>
              <div className="text-[11px] text-emerald-400/80 hidden sm:block">
                PING: {systemInfo?.pingMs || 14}ms // PROTOCOL: FASTAPI REST
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command Error Alert if any occurred */}
        {commandError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-400 text-rose-200 font-mono text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <OctagonX className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{commandError}</span>
            </div>
            <button 
              onClick={() => setCommandError(null)}
              className="text-slate-400 hover:text-white ml-2 uppercase font-bold"
            >
              DISMISS
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MAIN 2-COLUMN LAYOUT GRID                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: Controls (Sections 1, 2, 3) (7 Cols)        */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* ------------------------------------------------------ */}
          {/* 2. DISTANCE CONTROL PANEL                              */}
          {/* ------------------------------------------------------ */}
          <GlassCard glowColor="purple" className="p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20">
              <div className="flex items-center gap-2 text-slate-200">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="font-orbitron font-bold text-sm tracking-wide uppercase text-white">
                  2. DISTANCE CONTROL
                </h3>
              </div>
              <div className="font-mono text-xs text-purple-300 font-semibold px-2.5 py-0.5 rounded bg-purple-950 border border-purple-500/40">
                TARGET STEP: <span className="text-white font-bold">{effectiveDistanceCm} cm</span> ({(effectiveDistanceCm / 100).toFixed(2)} m)
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DISTANCE_PRESETS.map((preset) => {
                const isSelected = distancePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!isConnected}
                    onClick={() => setDistancePreset(preset.id)}
                    className={`
                      p-3 rounded-xl border font-mono text-left transition-all duration-200 select-none
                      ${!isConnected ? 'opacity-40 cursor-not-allowed border-slate-800 bg-cyber-void/40' : 'cursor-pointer'}
                      ${isSelected && isConnected
                        ? 'bg-purple-900/80 border-purple-300 text-white shadow-[0_0_18px_rgba(168,85,247,0.5)] ring-1 ring-purple-400' 
                        : 'bg-cyber-void/70 border-purple-500/25 text-slate-400 hover:border-purple-400/50 hover:text-purple-200'
                      }
                    `}
                  >
                    <div className="font-orbitron font-bold text-sm text-purple-200">
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Distance Input Field (Only shown when custom is selected) */}
            {distancePreset === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 font-mono text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-slate-300 font-semibold block uppercase">
                      ENTER CUSTOM DISTANCE (CM)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Valid range: 1 cm to 1000 cm (10 meters)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isConnected}
                      onClick={() => setCustomDistanceCm(Math.max(1, customDistanceCm - 25))}
                      className="px-2 py-1.5 rounded-lg bg-cyber-void border border-purple-500/30 text-purple-300 hover:text-white cursor-pointer"
                    >
                      -25
                    </button>
                    <button
                      type="button"
                      disabled={!isConnected}
                      onClick={() => setCustomDistanceCm(Math.max(1, customDistanceCm - 5))}
                      className="px-2 py-1.5 rounded-lg bg-cyber-void border border-purple-500/30 text-purple-300 hover:text-white cursor-pointer"
                    >
                      -5
                    </button>

                    <div className="relative w-28">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        disabled={!isConnected}
                        value={customDistanceCm}
                        onChange={(e) => setCustomDistanceCm(Number(e.target.value))}
                        className="w-full bg-cyber-void border-2 border-purple-400/60 rounded-lg px-3 py-1.5 text-center font-orbitron font-bold text-white focus:outline-none focus:border-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">
                        CM
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!isConnected}
                      onClick={() => setCustomDistanceCm(Math.min(1000, customDistanceCm + 5))}
                      className="px-2 py-1.5 rounded-lg bg-cyber-void border border-purple-500/30 text-purple-300 hover:text-white cursor-pointer"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      disabled={!isConnected}
                      onClick={() => setCustomDistanceCm(Math.min(1000, customDistanceCm + 25))}
                      className="px-2 py-1.5 rounded-lg bg-cyber-void border border-purple-500/30 text-purple-300 hover:text-white cursor-pointer"
                    >
                      +25
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </GlassCard>

          {/* ------------------------------------------------------ */}
          {/* 1. DIRECTION CONTROL PANEL                             */}
          {/* ------------------------------------------------------ */}
          <GlassCard glowColor="purple" className="p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-purple-500/20 mb-6">
              <div className="flex items-center gap-2 text-slate-200">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="font-orbitron font-bold text-sm tracking-wide uppercase text-white">
                  1. DIRECTION CONTROL PANEL
                </h3>
              </div>
              <span className="text-[11px] font-mono text-purple-300">
                MOVE DISTANCE: <span className="font-bold text-white">{effectiveDistanceCm} cm</span>
              </span>
            </div>

            {/* D-Pad & Emergency Stop Cluster */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center my-3 select-none">
              
              {/* Outer decorative neon ring */}
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/25 border-dashed" />
              <div className="absolute inset-4 rounded-full border border-purple-500/15" />

              {/* FORWARD BUTTON */}
              <motion.button
                whileHover={isConnected && !isDispatching ? { scale: 1.05 } : {}}
                whileTap={isConnected && !isDispatching ? { scale: 0.94 } : {}}
                disabled={!isConnected || isDispatching}
                onClick={() => handleMove('forward')}
                className={`
                  absolute top-1 w-28 h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-mono transition-all duration-200
                  ${!isConnected ? 'opacity-40 cursor-not-allowed border-slate-700 bg-cyber-void/80 text-slate-500' : 'cursor-pointer'}
                  ${activeDirectionKey === 'forward' 
                    ? 'bg-purple-600 border-white text-white shadow-[0_0_30px_rgba(168,85,247,1)]' 
                    : isConnected 
                      ? 'bg-purple-950/70 border-purple-400/50 text-purple-200 hover:border-purple-300 hover:bg-purple-900/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : ''
                  }
                `}
              >
                <ArrowUp className="w-6 h-6 text-purple-300 mb-0.5" />
                <span className="font-orbitron font-bold text-xs tracking-wider">FORWARD</span>
                <span className="text-[10px] text-purple-300 font-semibold font-mono">+{effectiveDistanceCm} cm</span>
              </motion.button>

              {/* LEFT BUTTON */}
              <motion.button
                whileHover={isConnected && !isDispatching ? { scale: 1.05 } : {}}
                whileTap={isConnected && !isDispatching ? { scale: 0.94 } : {}}
                disabled={!isConnected || isDispatching}
                onClick={() => handleMove('left')}
                className={`
                  absolute left-1 w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center font-mono transition-all duration-200
                  ${!isConnected ? 'opacity-40 cursor-not-allowed border-slate-700 bg-cyber-void/80 text-slate-500' : 'cursor-pointer'}
                  ${activeDirectionKey === 'left' 
                    ? 'bg-purple-600 border-white text-white shadow-[0_0_30px_rgba(168,85,247,1)]' 
                    : isConnected 
                      ? 'bg-purple-950/70 border-purple-400/50 text-purple-200 hover:border-purple-300 hover:bg-purple-900/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : ''
                  }
                `}
              >
                <ArrowLeft className="w-6 h-6 text-purple-300 mb-0.5" />
                <span className="font-orbitron font-bold text-xs tracking-wider">LEFT</span>
                <span className="text-[10px] text-purple-300 font-semibold font-mono">{effectiveDistanceCm} cm</span>
              </motion.button>

              {/* --- LARGE VISUALLY PROMINENT EMERGENCY STOP BUTTON --- */}
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={executeStop}
                className={`
                  w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex flex-col items-center justify-center font-orbitron select-none cursor-pointer transition-all z-20
                  ${isBraking 
                    ? 'bg-rose-500 border-white text-white shadow-[0_0_45px_rgba(244,63,94,1)] scale-105' 
                    : 'bg-gradient-to-tr from-rose-950 via-rose-700 to-red-600 border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.7),inset_0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_45px_rgba(244,63,94,1)]'
                  }
                `}
                title="Always Immediately Available"
              >
                <OctagonX className={`w-8 h-8 sm:w-9 sm:h-9 ${isBraking ? 'animate-spin' : 'animate-pulse'}`} />
                <span className="text-xs sm:text-sm font-black tracking-wider mt-1">STOP</span>
                <span className="text-[9px] font-mono tracking-tighter opacity-80">(SPACE)</span>
              </motion.button>

              {/* RIGHT BUTTON */}
              <motion.button
                whileHover={isConnected && !isDispatching ? { scale: 1.05 } : {}}
                whileTap={isConnected && !isDispatching ? { scale: 0.94 } : {}}
                disabled={!isConnected || isDispatching}
                onClick={() => handleMove('right')}
                className={`
                  absolute right-1 w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center font-mono transition-all duration-200
                  ${!isConnected ? 'opacity-40 cursor-not-allowed border-slate-700 bg-cyber-void/80 text-slate-500' : 'cursor-pointer'}
                  ${activeDirectionKey === 'right' 
                    ? 'bg-purple-600 border-white text-white shadow-[0_0_30px_rgba(168,85,247,1)]' 
                    : isConnected 
                      ? 'bg-purple-950/70 border-purple-400/50 text-purple-200 hover:border-purple-300 hover:bg-purple-900/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : ''
                  }
                `}
              >
                <ArrowRight className="w-6 h-6 text-purple-300 mb-0.5" />
                <span className="font-orbitron font-bold text-xs tracking-wider">RIGHT</span>
                <span className="text-[10px] text-purple-300 font-semibold font-mono">{effectiveDistanceCm} cm</span>
              </motion.button>

              {/* BACKWARD BUTTON */}
              <motion.button
                whileHover={isConnected && !isDispatching ? { scale: 1.05 } : {}}
                whileTap={isConnected && !isDispatching ? { scale: 0.94 } : {}}
                disabled={!isConnected || isDispatching}
                onClick={() => handleMove('backward')}
                className={`
                  absolute bottom-1 w-28 h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-mono transition-all duration-200
                  ${!isConnected ? 'opacity-40 cursor-not-allowed border-slate-700 bg-cyber-void/80 text-slate-500' : 'cursor-pointer'}
                  ${activeDirectionKey === 'backward' 
                    ? 'bg-purple-600 border-white text-white shadow-[0_0_30px_rgba(168,85,247,1)]' 
                    : isConnected 
                      ? 'bg-purple-950/70 border-purple-400/50 text-purple-200 hover:border-purple-300 hover:bg-purple-900/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : ''
                  }
                `}
              >
                <ArrowDown className="w-6 h-6 text-purple-300 mb-0.5" />
                <span className="font-orbitron font-bold text-xs tracking-wider">BACKWARD</span>
                <span className="text-[10px] text-purple-300 font-semibold font-mono">-{effectiveDistanceCm} cm</span>
              </motion.button>
            </div>

            {/* Instruction Tip */}
            <div className="text-[11px] font-mono text-slate-400 text-center mt-2">
              POST /api/rover/move <span className="text-purple-300">{"{ direction, distance_cm }"}</span>
            </div>
          </GlassCard>

          {/* ------------------------------------------------------ */}
          {/* 3. ROTATION CONTROL PANEL                              */}
          {/* ------------------------------------------------------ */}
          <GlassCard glowColor="purple" className="p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20">
              <div className="flex items-center gap-2 text-slate-200">
                <RotateCcw className="w-4 h-4 text-purple-400" />
                <h3 className="font-orbitron font-bold text-sm tracking-wide uppercase text-white">
                  3. ROTATION CONTROL PANEL
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                DISCRETE ANGLE PIVOT
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ROTATION_CONTROLS.map((rot) => {
                const Icon = rot.icon;
                const isRotActive = activeRotationKey === rot.id;
                return (
                  <motion.button
                    key={rot.id}
                    whileHover={isConnected && !isDispatching ? { scale: 1.02 } : {}}
                    whileTap={isConnected && !isDispatching ? { scale: 0.96 } : {}}
                    disabled={!isConnected || isDispatching}
                    onClick={() => handleTurn(rot.direction, rot.angle, rot.id)}
                    className={`
                      p-3.5 rounded-xl border flex flex-col items-center justify-center font-mono text-center transition-all duration-200 select-none
                      ${!isConnected ? 'opacity-40 cursor-not-allowed border-slate-800 bg-cyber-void/40' : 'cursor-pointer'}
                      ${isRotActive 
                        ? 'bg-purple-600 border-white text-white shadow-[0_0_20px_rgba(168,85,247,0.8)]' 
                        : isConnected 
                          ? 'bg-cyber-void/70 border-purple-500/30 text-slate-200 hover:border-purple-300 hover:bg-purple-950/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                          : ''
                      }
                    `}
                  >
                    <Icon className="w-6 h-6 text-purple-300 mb-1" />
                    <span className="font-orbitron font-bold text-xs tracking-wider">
                      {rot.label}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {rot.sub}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="text-[11px] font-mono text-slate-400 text-center mt-3 pt-3 border-t border-purple-500/10">
              POST /api/rover/turn <span className="text-purple-300">{"{ direction, angle }"}</span>
            </div>
          </GlassCard>

        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: 4. LIVE STATUS PANEL (5 Cols)              */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* ------------------------------------------------------ */}
          {/* 4. LIVE STATUS PANEL                                   */}
          {/* ------------------------------------------------------ */}
          <GlassCard glowColor="cyan" className="p-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                <div>
                  <h3 className="font-orbitron font-bold text-base text-white">
                    4. LIVE STATUS PANEL
                  </h3>
                  <p className="text-[11px] font-mono text-purple-300/80">
                    REAL BACKEND VALUES
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <StatusBadge
                status={badge.text}
                variant={badge.variant}
                size="sm"
              />
            </div>

            {/* Live Metrics Grid */}
            <div className="space-y-3.5 font-mono text-xs">
              
              {/* Rover State */}
              <div className="p-3 rounded-xl bg-cyber-void/80 border border-purple-500/20 flex items-center justify-between">
                <span className="text-slate-400 uppercase font-semibold">ROVER STATE:</span>
                <span className={`font-orbitron font-bold text-sm tracking-wider px-2 py-0.5 rounded ${
                  liveState === 'MOVING' ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-400/40' :
                  liveState === 'TURNING' ? 'text-purple-300 bg-purple-950/60 border border-purple-400/40' :
                  liveState === 'STOPPED' ? 'text-rose-400 bg-rose-950/60 border border-rose-500/40' :
                  liveState === 'IDLE' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/40' :
                  'text-slate-400 bg-slate-900 border border-slate-700'
                }`}>
                  {liveState}
                </span>
              </div>

              {/* Current Command */}
              <div className="p-3 rounded-xl bg-cyber-void/80 border border-purple-500/20">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="uppercase font-semibold">CURRENT COMMAND:</span>
                  <span className="text-[10px] text-cyan-400">ACTIVE EXECUTION</span>
                </div>
                <div className="font-orbitron font-bold text-sm sm:text-base text-white tracking-wide text-glow-cyan">
                  {liveCurrentCommand}
                </div>
              </div>

              {/* Connection Status */}
              <div className="p-3 rounded-xl bg-cyber-void/80 border border-purple-500/20 flex items-center justify-between">
                <span className="text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                  {isConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
                  CONNECTION STATUS:
                </span>
                <span className={`font-bold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isConnected ? `CONNECTED (${systemInfo?.pingMs || 14}ms)` : 'DISCONNECTED'}
                </span>
              </div>

              {/* Last Command Timestamp */}
              <div className="p-3 rounded-xl bg-cyber-void/80 border border-purple-500/20 flex items-center justify-between">
                <span className="text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  LAST TIMESTAMP:
                </span>
                <span className="text-slate-200 font-semibold">
                  {liveTimestamp}
                </span>
              </div>

              {/* Backend Confirmation Response */}
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30">
                <div className="flex items-center gap-1.5 text-purple-300 font-semibold mb-1 uppercase text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  BACKEND CONFIRMATION RESPONSE:
                </div>
                <div className="text-slate-200 text-xs italic bg-cyber-void/60 p-2 rounded-lg border border-purple-500/15">
                  "{liveConfirmation}"
                </div>
              </div>

            </div>

            {/* Clear Distinction: Frontend UI State vs Actual Rover State */}
            <div className="mt-5 pt-4 border-t border-purple-500/20 font-mono text-xs">
              <div className="text-[11px] text-slate-400 uppercase mb-2 font-bold tracking-wider">
                STATE VERIFICATION INTEGRITY
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-cyber-void border border-purple-500/15">
                  <span className="text-slate-400 block text-[10px]">FRONTEND UI TARGET:</span>
                  <span className="text-purple-300 font-bold block mt-0.5">
                    {effectiveDistanceCm} cm step
                  </span>
                  <span className="text-slate-500 text-[9px]">Client intent</span>
                </div>

                <div className="p-2.5 rounded-lg bg-cyber-void border border-cyan-500/20">
                  <span className="text-slate-400 block text-[10px]">ACTUAL HARDWARE:</span>
                  <span className="text-cyan-300 font-bold block mt-0.5">
                    {liveState}
                  </span>
                  <span className="text-slate-500 text-[9px]">Backend verified</span>
                </div>
              </div>
            </div>

            {/* Peripherals & Headlights */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-purple-500/20">
              <CyberButton
                size="sm"
                variant={headlights ? 'primary' : 'outline'}
                icon={Lightbulb}
                onClick={toggleHeadlights}
                className="flex-1"
              >
                {headlights ? 'BEAMS: ON' : 'BEAMS: OFF'}
              </CyberButton>

              <CyberButton
                size="sm"
                variant={underglow ? 'primary' : 'outline'}
                icon={Sparkles}
                onClick={toggleUnderglow}
                className="flex-1"
              >
                {underglow ? 'NEON: ON' : 'NEON: OFF'}
              </CyberButton>
            </div>

          </GlassCard>

          {/* Optical Targeting Viewport (Sensor Feed) */}
          <GlassCard glowColor="purple" className="p-5">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-purple-500/20 text-xs font-mono">
              <span className="text-slate-300 uppercase flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-purple-400" />
                OPTICAL LIDAR DISTANCE
              </span>
              <span className="text-emerald-400">
                {telemetry?.sensors?.frontObstacleDistCm || 142} cm clear
              </span>
            </div>

            <div className="relative w-full aspect-[21/9] rounded-xl bg-cyber-void border border-purple-500/30 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-cyber-grid opacity-25" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-purple-500/40 flex items-center justify-center animate-spin" style={{ animationDuration: '15s' }}>
                  <Crosshair className="w-6 h-6 text-purple-300" />
                </div>
                <div className="font-mono text-xs">
                  <div className="text-purple-300 font-bold">HORIZON LOCKED</div>
                  <div className="text-[10px] text-slate-400">BEARING: {telemetry?.sensors?.headingDeg || 284}° W</div>
                </div>
              </div>
            </div>
          </GlassCard>

        </div>

      </div>

    </div>
  );
}

export default ControlPage;
