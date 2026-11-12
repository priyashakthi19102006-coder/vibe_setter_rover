/**
 * VIBESETTER OS - MetricIndicator Component
 * 
 * Clean visual readout for telemetry, sensors, and status variables.
 */

import React from 'react';

export function MetricIndicator({
  label,
  value,
  unit = '',
  icon: Icon,
  color = 'purple', // 'purple' | 'cyan' | 'magenta' | 'emerald' | 'amber'
  progress = null, // Optional 0-100 number
  subValue = null
}) {
  const colorMap = {
    purple: { text: 'text-purple-400', bar: 'bg-gradient-to-r from-purple-600 to-indigo-500', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]' },
    cyan: { text: 'text-cyan-400', bar: 'bg-gradient-to-r from-cyan-500 to-blue-500', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]' },
    magenta: { text: 'text-fuchsia-400', bar: 'bg-gradient-to-r from-fuchsia-500 to-pink-500', glow: 'shadow-[0_0_10px_rgba(217,70,239,0.5)]' },
    emerald: { text: 'text-emerald-400', bar: 'bg-gradient-to-r from-emerald-500 to-teal-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' },
    amber: { text: 'text-amber-400', bar: 'bg-gradient-to-r from-amber-500 to-orange-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]' }
  };

  const scheme = colorMap[color] || colorMap.purple;

  return (
    <div className="flex flex-col p-3 rounded-lg bg-cyber-void/60 border border-purple-500/15">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className={`w-3.5 h-3.5 ${scheme.text}`} />}
          <span className="uppercase tracking-wider">{label}</span>
        </span>
        {subValue && <span className="text-slate-500">{subValue}</span>}
      </div>

      <div className="flex items-baseline gap-1 my-0.5">
        <span className="font-orbitron text-xl font-bold tracking-tight text-white">
          {value !== undefined && value !== null ? value : '--'}
        </span>
        {unit && (
          <span className="text-xs font-mono text-slate-400 font-semibold">{unit}</span>
        )}
      </div>

      {progress !== null && (
        <div className="w-full bg-slate-900/80 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${scheme.bar} ${scheme.glow}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default MetricIndicator;

