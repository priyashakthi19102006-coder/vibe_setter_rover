/**
 * VIBESETTER OS - Connection Status Card
 * 
 * Displays network diagnostics, Python backend link, signal strength,
 * and live ping latency testing.
 */

import React, { useState } from 'react';
import { 
  Wifi, 
  Radio, 
  Server, 
  Activity, 
  CheckCircle2, 
  RefreshCw,
  Signal
} from 'lucide-react';
import GlassCard from '../common/GlassCard';
import MetricIndicator from '../common/MetricIndicator';
import StatusBadge from '../common/StatusBadge';
import CyberButton from '../common/CyberButton';
import { pingBackend } from '../../services/systemService';

export function ConnectionCard({
  systemInfo: rawSystemInfo,
  isConnected = false,
  connectionStatus = 'DISCONNECTED',
  onRefresh
}) {
  const systemInfo = rawSystemInfo || {
    backendStatus: isConnected ? 'CONNECTED' : 'STANDBY',
    protocol: 'WebSocket / FastAPI 0.115',
    ipAddress: '127.0.0.1',
    port: 8000,
    pingMs: 0,
    wifiSsid: 'VIBEROVER_CORE',
    signalDbm: -60,
    packetLossPercent: 0.0
  };
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingBackend();
      setPingResult(res.success ? `${res.latencyMs}ms (PONG)` : 'ERR');
    } catch (err) {
      setPingResult('TIMEOUT');
    } finally {
      setIsPinging(false);
      if (onRefresh) onRefresh();
    }
  };

  const getSignalStrength = (dbm) => {
    if (dbm > -50) return { label: 'EXCELLENT', color: 'emerald' };
    if (dbm > -65) return { label: 'GOOD', color: 'cyan' };
    return { label: 'FAIR', color: 'amber' };
  };

  const signal = getSignalStrength(systemInfo.signalDbm);

  return (
    <GlassCard glowColor="cyan" className="p-5 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base tracking-wide text-white">
                CONNECTION STATUS
              </h3>
              <p className="text-[11px] font-mono text-purple-300/80">
                TELEMETRY & HARDWARE BRIDGE
              </p>
            </div>
          </div>

          <StatusBadge 
            status={connectionStatus || (isConnected ? 'CONNECTED' : 'DISCONNECTED')} 
            variant={connectionStatus === 'CONNECTED' ? 'online' : connectionStatus === 'CONNECTING' ? 'warning' : 'offline'} 
            size="sm" 
          />
        </div>

        {/* IP & Protocol Banner */}
        <div className="p-3 mb-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-cyan-400" />
              ENDPOINT
            </span>
            <span className="text-cyan-300 font-mono font-semibold">
              {systemInfo.protocol}
            </span>
          </div>

          <div className="font-mono text-sm sm:text-base font-bold text-white mt-1 tracking-wider text-glow-cyan">
            http://{systemInfo.ipAddress}:{systemInfo.port}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-cyan-500/15 text-xs font-mono text-slate-400">
            <span>NETWORK: <span className="text-purple-300 font-semibold">{systemInfo.wifiSsid}</span></span>
            <span className="text-emerald-400 font-semibold">0.0% LOSS</span>
          </div>
        </div>

        {/* Diagnostic Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          <MetricIndicator
            label="Ping Latency"
            value={systemInfo.pingMs}
            unit="ms"
            icon={Activity}
            color="cyan"
            progress={Math.min(100, (systemInfo.pingMs / 80) * 100)}
          />

          <MetricIndicator
            label="Signal RSSI"
            value={`${systemInfo.signalDbm}`}
            unit="dBm"
            subValue={signal.label}
            icon={Signal}
            color="emerald"
            progress={Math.min(100, Math.max(0, 100 + systemInfo.signalDbm))}
          />
        </div>
      </div>

      {/* Ping Test Button */}
      <div className="pt-4 mt-3 border-t border-purple-500/15 flex items-center gap-2">
        <CyberButton
          size="sm"
          variant="secondary"
          icon={RefreshCw}
          onClick={handleTestPing}
          disabled={isPinging}
          className="w-full"
        >
          {isPinging ? 'PINGING...' : pingResult ? `PING: ${pingResult}` : 'TEST BACKEND PING'}
        </CyberButton>
      </div>
    </GlassCard>
  );
}

export default ConnectionCard;

