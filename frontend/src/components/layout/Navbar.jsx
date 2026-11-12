/**
 * VIBESETTER OS - Top Navigation Bar
 * 
 * Features:
 * - VIBESETTER OS Logo with neon glow
 * - Real-time connection status indicator with ping latency
 * - Battery placeholder with live percentage, voltage, and charging state
 * - Settings shortcut button
 * - Live system time
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Wifi, 
  WifiOff, 
  BatteryCharging, 
  BatteryMedium, 
  Settings, 
  Activity,
  Cpu,
  Radio
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export function Navbar({
  isConnected = true,
  pingMs = 14,
  battery = { percentage: 84, voltage: 12.6, charging: false },
  onOpenSettings,
  activeTab = 'dashboard'
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const getBatteryColor = (pct) => {
    if (pct > 50) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (pct > 20) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-cyber-bg/80 border-b border-purple-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      {/* Top subtle neon light line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500/70 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* LEFT: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          >
            <Bot className="w-5 h-5 text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
            </span>
          </motion.div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-extrabold text-lg sm:text-xl tracking-wider bg-gradient-to-r from-purple-200 via-purple-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                VIBESETTER
              </span>
              <span className="font-orbitron font-bold text-xs px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-400/40 text-purple-300 tracking-widest">
                OS
              </span>
            </div>
            <span className="hidden sm:inline text-[10px] font-mono tracking-widest text-slate-400 uppercase -mt-0.5">
              Neural Rover Telemetry Core
            </span>
          </div>
        </div>

        {/* CENTER: Live Clock & Quick Diagnostics (Desktop) */}
        <div className="hidden md:flex items-center gap-6 px-4 py-1.5 rounded-full bg-cyber-void/80 border border-purple-500/20 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>CORE NODE: <span className="text-purple-300 font-semibold">ONLINE</span></span>
          </div>
          <div className="h-3 w-[1px] bg-purple-500/30" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>PING: <span className="text-cyan-300 font-semibold">{pingMs}ms</span></span>
          </div>
          <div className="h-3 w-[1px] bg-purple-500/30" />
          <div className="text-slate-300 tracking-widest font-semibold">
            {currentTime || '00:00:00'}
          </div>
        </div>

        {/* RIGHT: Status Indicators, Battery & Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Connection Status Indicator */}
          <div className="flex items-center">
            {isConnected ? (
              <StatusBadge 
                status="Backend Online" 
                variant="online" 
                size="sm" 
                className="inline-flex"
              />
            ) : (
              <StatusBadge 
                status="Backend Offline" 
                variant="offline" 
                size="sm" 
                className="inline-flex"
              />
            )}
          </div>

          {/* Battery Status Indicator */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border backdrop-blur-md font-mono text-xs transition-all ${getBatteryColor(battery?.percentage ?? 84)}`}>
            {battery?.charging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <BatteryMedium className="w-4 h-4" />
            )}
            <div className="flex items-center gap-1 font-semibold">
              <span>{Math.round(battery?.percentage ?? 84)}%</span>
              <span className="hidden sm:inline text-[10px] text-slate-400">
                ({battery?.voltage ?? 12.6}V)
              </span>
            </div>
          </div>

          {/* Settings Button */}
          <motion.button
            whileHover={{ scale: 1.05, rotate: 30 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings}
            className={`
              p-2 rounded-xl border transition-all duration-200 cursor-pointer
              ${activeTab === 'settings' 
                ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                : 'bg-cyber-surface/60 border-purple-500/30 text-slate-300 hover:text-white hover:border-purple-400 hover:bg-purple-950/40'
              }
            `}
            title="System Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>

        </div>

      </div>
    </header>
  );
}

export default Navbar;

