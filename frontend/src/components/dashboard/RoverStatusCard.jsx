/**
 * VIBESETTER OS - Rover Status Card
 * 
 * Displays core rover hardware telemetry:
 * - Speedometer & Motor PWM status
 * - Motor temperatures (L/R)
 * - Obstacle detection radar
 * - Active drive mode
 * - Emergency brake & headlight controls
 */

import React from 'react';
import { 
  Gauge, 
  Thermometer, 
  Radar, 
  Compass, 
  Lightbulb, 
  ShieldAlert,
  Zap
} from 'lucide-react';
import GlassCard from '../common/GlassCard';
import MetricIndicator from '../common/MetricIndicator';
import CyberButton from '../common/CyberButton';

export function RoverStatusCard({
  telemetry,
  onEmergencyStop,
  onToggleLights,
  headlightsActive = true
}) {
  const movement = telemetry?.movement || {
    speed: 0.0,
    maxSpeed: 3.5,
    driveMode: 'sport',
    motorTempLeft: 34.2,
    motorTempRight: 35.1
  };

  const sensors = telemetry?.sensors || {
    frontObstacleDistCm: 142,
    headingDeg: 284
  };

  const speedPercent = Math.min(100, (movement.speed / movement.maxSpeed) * 100);

  return (
    <GlassCard glowColor="purple" className="p-5 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base tracking-wide text-white">
                ROVER STATUS
              </h3>
              <p className="text-[11px] font-mono text-purple-300/80">
                DRIVE MOTORS & HARDWARE TELEMETRY
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded bg-purple-900/40 border border-purple-500/40 text-purple-300">
            {movement.driveMode} MODE
          </span>
        </div>

        {/* Speedometer Main Highlight */}
        <div className="p-3.5 mb-3 rounded-xl bg-purple-950/20 border border-purple-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 uppercase flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400" />
              VELOCITY
            </span>
            <span className="text-xs font-mono text-purple-400">
              MAX: {movement.maxSpeed} m/s
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-1">
            <span className="font-orbitron text-3xl font-extrabold text-white text-glow-purple">
              {movement.speed.toFixed(1)}
            </span>
            <span className="font-mono text-xs text-purple-300 font-semibold">m/s</span>
            <span className="font-mono text-xs text-slate-400 ml-2">
              (~{(movement.speed * 3.6).toFixed(1)} km/h)
            </span>
          </div>

          {/* Speed Bar */}
          <div className="w-full bg-slate-900/90 rounded-full h-2 mt-2 border border-purple-900/60 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.7)] transition-all duration-300"
              style={{ width: `${Math.max(5, speedPercent)}%` }}
            />
          </div>
        </div>

        {/* Sub Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <MetricIndicator
            label="Motor Temps"
            value={`${movement.motorTempLeft}°C`}
            subValue={`R: ${movement.motorTempRight}°C`}
            icon={Thermometer}
            color="purple"
            progress={Math.min(100, (movement.motorTempLeft / 80) * 100)}
          />

          <MetricIndicator
            label="Front Radar"
            value={sensors.frontObstacleDistCm}
            unit="cm"
            icon={Radar}
            color="cyan"
            progress={Math.min(100, (sensors.frontObstacleDistCm / 300) * 100)}
          />
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="pt-4 mt-3 border-t border-purple-500/15 flex items-center gap-2">
        <CyberButton
          size="sm"
          variant={headlightsActive ? 'primary' : 'outline'}
          icon={Lightbulb}
          onClick={onToggleLights}
          className="flex-1"
        >
          {headlightsActive ? 'BEAMS ON' : 'BEAMS OFF'}
        </CyberButton>

        <CyberButton
          size="sm"
          variant="danger"
          icon={ShieldAlert}
          onClick={onEmergencyStop}
          className="flex-1"
        >
          E-STOP
        </CyberButton>
      </div>
    </GlassCard>
  );
}

export default RoverStatusCard;

