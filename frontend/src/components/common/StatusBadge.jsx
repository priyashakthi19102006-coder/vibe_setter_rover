/**
 * VIBESETTER OS - Status Badge Component
 * 
 * Renders an animated status indicator with pulsing beacon dot and glowing border.
 */

import React from 'react';

const VARIANTS = {
  online: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    pulse: 'bg-emerald-400'
  },
  active: {
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/40',
    text: 'text-purple-300',
    dot: 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]',
    pulse: 'bg-purple-400'
  },
  warning: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    pulse: 'bg-amber-400'
  },
  offline: {
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
    pulse: 'bg-rose-500'
  },
  cyan: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/40',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
    pulse: 'bg-cyan-400'
  }
};

export function StatusBadge({
  status = 'ONLINE',
  variant = 'online',
  size = 'md',
  showDot = true,
  className = ''
}) {
  const current = VARIANTS[variant] || VARIANTS.online;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 tracking-widest',
    lg: 'text-sm px-3.5 py-1.5 tracking-widest'
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border backdrop-blur-md uppercase font-mono font-medium ${current.bg} ${current.border} ${current.text} ${sizeClasses[size]} ${className}`}>
      {showDot && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.pulse}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
        </span>
      )}
      <span>{status}</span>
    </div>
  );
}

export default StatusBadge;

