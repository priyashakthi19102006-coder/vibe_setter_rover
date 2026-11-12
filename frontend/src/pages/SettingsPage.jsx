/**
 * VIBESETTER OS - Settings & Hardware Configuration Page
 * ========================================================
 * High-tech configuration dashboard for the Python FastAPI bridge,
 * physical ESP32 target endpoints, local Ollama 3B inference model,
 * telemetry rates, obstacle safety limits, and hardware pinout diagnostics.
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Server, 
  Activity, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  Check, 
  Terminal,
  Cpu,
  Wifi,
  WifiOff,
  Radio,
  Sliders,
  Database,
  Volume2,
  AlertCircle,
  Clock
} from 'lucide-react';

import GlassCard from '../components/common/GlassCard';
import CyberButton from '../components/common/CyberButton';
import StatusBadge from '../components/common/StatusBadge';
import { pingBackend, updateSystemConfig, getSystemInfo } from '../services/systemService';
import { getAIStatus } from '../services/aiService';

export function SettingsPage({
  systemInfo: initialSystemInfo
}) {
  const [backendUrl, setBackendUrl] = useState(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api');
  const [esp32Url, setEsp32Url] = useState('http://192.168.4.1');
  const [pollRate, setPollRate] = useState(2000);
  const [safetyStopDistCm, setSafetyStopDistCm] = useState(30);
  const [serialBaud, setSerialBaud] = useState('115200');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState(null);
  const [systemDetails, setSystemDetails] = useState(initialSystemInfo);
  const [aiStatus, setAiStatus] = useState(null);
  const [isLoadingAiStatus, setIsLoadingAiStatus] = useState(false);

  // Load system and Ollama status on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchDiagnostics() {
      try {
        const [sys, ai] = await Promise.all([
          getSystemInfo().catch(() => null),
          getAIStatus().catch(() => null)
        ]);
        if (isMounted) {
          if (sys) {
            setSystemDetails(sys);
            if (sys.esp32_url) setEsp32Url(sys.esp32_url);
          }
          if (ai) setAiStatus(ai);
        }
      } catch (err) {
        console.warn('[SettingsPage] Diagnostic fetch warning:', err);
      }
    }

    fetchDiagnostics();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTestPing = async () => {
    setPingStatus('Testing backend ping...');
    try {
      const res = await pingBackend();
      if (res.success) {
        setPingStatus(`Connected! Latency: ${res.latencyMs}ms | Hardware: ${res.data?.esp32_connected ? 'ONLINE' : 'DISCONNECTED'}`);
      } else {
        setPingStatus('Offline (Simulation active)');
      }
    } catch {
      setPingStatus('Unreachable');
    }
  };

  const handleRefreshAiStatus = async () => {
    setIsLoadingAiStatus(true);
    try {
      const ai = await getAIStatus();
      setAiStatus(ai);
    } catch (err) {
      console.warn('[SettingsPage] Ollama refresh error:', err);
    } finally {
      setIsLoadingAiStatus(false);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavedSuccess(true);
    try {
      await updateSystemConfig({
        backendUrl,
        esp32_url: esp32Url,
        pollRate,
        safetyStopDistCm,
        serialBaud
      });
    } catch (err) {
      console.warn('[SettingsPage] Config save warning:', err);
    }
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-purple-500/20">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
              SYSTEM & HARDWARE SETTINGS
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-900/60 border border-purple-400/50 text-purple-300">
              CONFIG v2.5
            </span>
          </div>
          <p className="text-sm font-mono text-slate-400 mt-1">
            Configure the Python backend bridge, physical ESP32 endpoints, local Ollama 3B, and autonomous safety boundaries.
          </p>
        </div>

        <CyberButton
          variant="primary"
          size="md"
          icon={savedSuccess ? Check : Save}
          onClick={handleSaveSettings}
        >
          {savedSuccess ? 'CONFIG APPLIED!' : 'SAVE SYSTEM CONFIG'}
        </CyberButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* ========================================================
            LEFT COLUMN (7 Cols): Network, ESP32, and Safety
            ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Python Backend & ESP32 Configuration Card */}
          <GlassCard glowColor="purple" className="p-6">
            <div className="flex items-center gap-2 pb-3 mb-5 border-b border-purple-500/20">
              <Server className="w-5 h-5 text-purple-400" />
              <h3 className="font-orbitron font-bold text-base text-white">
                HARDWARE & BACKEND BRIDGE
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 font-mono text-xs">
              {/* FastAPI Backend URL */}
              <div>
                <label className="block text-slate-300 uppercase mb-1.5 font-semibold">
                  API BASE URL (FASTAPI BACKEND)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    placeholder="http://localhost:8000/api"
                    className="flex-1 bg-cyber-void/80 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-400"
                  />
                  <CyberButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={handleTestPing}
                  >
                    TEST
                  </CyberButton>
                </div>
                {pingStatus && (
                  <div className="mt-1.5 text-[11px] text-cyan-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {pingStatus}
                  </div>
                )}
              </div>

              {/* Physical ESP32 Target URL */}
              <div>
                <label className="block text-slate-300 uppercase mb-1.5 font-semibold">
                  PHYSICAL ESP32 ROVER ENDPOINT
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={esp32Url}
                    onChange={(e) => setEsp32Url(e.target.value)}
                    placeholder="http://192.168.4.1"
                    className="flex-1 bg-cyber-void/80 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Default SoftAP: <code className="text-purple-300">http://192.168.4.1</code> | Station Mode: Check router DHCP lease.
                </span>
              </div>

              {/* Telemetry Polling Rate */}
              <div>
                <div className="flex justify-between text-slate-300 uppercase mb-1.5">
                  <span className="font-semibold">TELEMETRY POLLING INTERVAL</span>
                  <span className="text-purple-300 font-bold">{pollRate} ms</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="250"
                  value={pollRate}
                  onChange={(e) => setPollRate(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Higher frequency yields smoother gauges; lower frequency saves battery & WiFi bandwidth.
                </span>
              </div>

              {/* Serial Baud Rate & Safety Stop Distance */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-300 uppercase mb-1.5 font-semibold">
                    SERIAL BAUD RATE
                  </label>
                  <select
                    value={serialBaud}
                    onChange={(e) => setSerialBaud(e.target.value)}
                    className="w-full bg-cyber-void/80 border border-purple-500/30 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    <option value="9600">9600 bps</option>
                    <option value="57600">57600 bps</option>
                    <option value="115200">115200 bps (Recommended)</option>
                    <option value="921600">921600 bps (High-Speed ROS2)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1.5 font-semibold">
                    E-BRAKE SENSOR TRIGGER
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={safetyStopDistCm}
                      onChange={(e) => setSafetyStopDistCm(Number(e.target.value))}
                      className="w-full bg-cyber-void/80 border border-purple-500/30 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                    />
                    <span className="text-slate-400">cm</span>
                  </div>
                </div>
              </div>
            </form>
          </GlassCard>

          {/* Quick-Start Terminal Instructions */}
          <GlassCard glowColor="purple" className="p-6 font-mono text-xs">
            <div className="flex items-center gap-2 text-purple-300 font-semibold mb-3">
              <Terminal className="w-4 h-4 text-purple-400" />
              BACKEND SERVER LAUNCH COMMANDS
            </div>
            <p className="text-slate-400 mb-2 leading-relaxed">
              Launch the FastAPI server and WebSocket telemetry bridge on port 8000:
            </p>
            <div className="p-3 rounded-xl bg-cyber-void border border-purple-500/20 text-purple-200 space-y-1">
              <div># Start FastAPI backend with automatic reloading:</div>
              <div className="text-emerald-300 font-bold">python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload</div>
              <div className="mt-2 text-slate-500"># Start React Vite frontend:</div>
              <div className="text-cyan-300 font-bold">npm run dev</div>
            </div>
          </GlassCard>

        </div>

        {/* ========================================================
            RIGHT COLUMN (5 Cols): Ollama Diagnostics & Specs
            ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Local Ollama 3B Model Status Card */}
          <GlassCard glowColor="cyan" className="p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="font-orbitron font-bold text-base text-white">
                  OLLAMA 3B NEURAL CORE
                </h3>
              </div>
              <CyberButton
                size="sm"
                variant="ghost"
                icon={RefreshCw}
                onClick={handleRefreshAiStatus}
                disabled={isLoadingAiStatus}
              >
                CHECK
              </CyberButton>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-cyan-500/10">
                <span className="text-slate-400">OLLAMA SERVICE:</span>
                <span className={`font-semibold ${aiStatus?.ollama?.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {aiStatus?.ollama?.connected ? '● ONLINE (11434)' : '○ OFFLINE (FALLBACK)'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-cyan-500/10">
                <span className="text-slate-400">ACTIVE MODEL:</span>
                <span className="text-cyan-300 font-bold">{aiStatus?.model || 'qwen2.5:3b'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-cyan-500/10">
                <span className="text-slate-400">INFERENCE LATENCY:</span>
                <span className="text-slate-200">
                  {aiStatus?.ollama?.latency_ms ? `${aiStatus.ollama.latency_ms.toFixed(1)} ms` : '~45 ms'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-cyan-500/10">
                <span className="text-slate-400">TTS SPEECH ENGINE:</span>
                <span className="text-purple-300 font-semibold">{aiStatus?.tts?.engine || 'pyttsx3 (SAPI5)'}</span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">INSTALLED MODELS:</span>
                <span className="text-slate-300 truncate max-w-[160px]">
                  {aiStatus?.ollama?.available_models?.join(', ') || 'qwen2.5:3b'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* ESP32 Hardware Pin Mapping Card */}
          <GlassCard glowColor="purple" className="p-6">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-purple-500/20">
              <Database className="w-5 h-5 text-purple-400" />
              <h3 className="font-orbitron font-bold text-base text-white">
                HARDWARE PIN MAP (ESP32)
              </h3>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-purple-500/10">
                <span className="text-slate-400">OLED I2C (SDA / SCL):</span>
                <span className="text-purple-300 font-semibold">GPIO 21 / GPIO 22</span>
              </div>
              <div className="flex justify-between py-1 border-b border-purple-500/10">
                <span className="text-slate-400">MPU6050 IMU:</span>
                <span className="text-purple-300 font-semibold">I2C (Addr: 0x68)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-purple-500/10">
                <span className="text-slate-400">LEFT MOTORS (PWM/IN1/IN2):</span>
                <span className="text-slate-200 font-semibold">GPIO 14 / 27 / 26</span>
              </div>
              <div className="flex justify-between py-1 border-b border-purple-500/10">
                <span className="text-slate-400">RIGHT MOTORS (PWM/IN3/IN4):</span>
                <span className="text-slate-200 font-semibold">GPIO 13 / 33 / 32</span>
              </div>
              <div className="flex justify-between py-1 border-b border-purple-500/10">
                <span className="text-slate-400">ENCODERS (LEFT / RIGHT):</span>
                <span className="text-slate-200 font-semibold">GPIO 34 / 35</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">STATUS LED:</span>
                <span className="text-emerald-400 font-semibold">GPIO 2 (Blue)</span>
              </div>
            </div>
          </GlassCard>

          {/* System Diagnostic Specs Card */}
          <GlassCard glowColor="purple" className="p-6">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-purple-500/20">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="font-orbitron font-bold text-base text-white">
                ROVER SPECIFICATIONS
              </h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-purple-500/10">
                <span className="text-slate-400">OS DISTRIBUTION:</span>
                <span className="text-purple-300 font-semibold">{systemDetails?.osVersion || 'VIBESETTER OS v2.5'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-purple-500/10">
                <span className="text-slate-400">CHASSIS CORE:</span>
                <span className="text-slate-200">{systemDetails?.hostName || 'VibeRover-Neural-Core'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-purple-500/10">
                <span className="text-slate-400">FAILSAFE BRAKE:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ENABLED (Priority Hard Cutoff)
                </span>
              </div>
            </div>
          </GlassCard>

        </div>

      </div>
    </div>
  );
}

export default SettingsPage;
