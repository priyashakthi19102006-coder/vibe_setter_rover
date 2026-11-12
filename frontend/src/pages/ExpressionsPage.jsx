/**
 * VIBESETTER OS - Expressions & Affective Mood Engine Page
 * ========================================================
 * Interactive face matrix controller and affective computing dashboard.
 * 
 * FEATURES:
 * 1. Current mood display with emotional valence, energy, and focus metrics
 * 2. High-fidelity animated OLED eye visualizer (128x64 SSD1306 simulator)
 * 3. Interactive 9-mood expression selector (HAPPY, EXCITED, SAD, ANGRY, SLEEPY, THINKING, LISTENING, TALKING, IDLE)
 * 4. Real hardware connection indicator (ESP32 OLED Synced vs Local Preview Mode)
 * 5. Autonomous trigger documentation (Mic -> LISTENING, LLM -> THINKING, TTS -> TALKING, etc.)
 * 6. Temporary reaction test runner with auto-revert timers
 * 7. Ambient underglow aura lighting swatches
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smile, 
  Sparkles, 
  Frown, 
  Flame, 
  Moon, 
  Cpu, 
  Mic, 
  MessageSquare, 
  Eye, 
  Sliders, 
  Heart, 
  Zap, 
  Activity, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Volume2,
  Clock,
  Radio
} from 'lucide-react';

import GlassCard from '../components/common/GlassCard';
import CyberButton from '../components/common/CyberButton';
import OledEyesVisualizer from '../components/expressions/OledEyesVisualizer';
import { MOOD_DEFINITIONS, getCurrentMood, setMood } from '../services/moodService';

// Icon component lookup for the 9 states
const ICON_MAP = {
  Smile,
  Sparkles,
  Frown,
  Flame,
  Moon,
  Cpu,
  Mic,
  MessageSquare,
  Eye
};

// Ambient Underglow / Face Aura Swatches
const AURA_COLORS = [
  { name: 'Neon Purple', hex: '#a855f7' },
  { name: 'Cyber Cyan', hex: '#06b6d4' },
  { name: 'Electric Magenta', hex: '#d946ef' },
  { name: 'Matrix Emerald', hex: '#10b981' },
  { name: 'Crimson Red', hex: '#f43f5e' },
  { name: 'Glitch Blue', hex: '#3b82f6' },
  { name: 'Solar Amber', hex: '#f59e0b' }
];

// System Behavior Autonomous Rules
const AUTONOMOUS_RULES = [
  {
    trigger: 'Microphone Active',
    state: 'LISTENING',
    icon: Mic,
    color: '#ec4899',
    description: 'Radar waves radiate above focused alert eyes during speech recognition.'
  },
  {
    trigger: 'Ollama 3B Inference',
    state: 'THINKING',
    icon: Cpu,
    color: '#06b6d4',
    description: 'Scanning pupil oscillation with sweep scanlines while processing prompt.'
  },
  {
    trigger: 'AI Speech Synthesis',
    state: 'TALKING',
    icon: MessageSquare,
    color: '#10b981',
    description: 'Expressive eye capsules paired with dynamic reactive vocal wave mouth.'
  },
  {
    trigger: 'Positive Conversation',
    state: 'HAPPY / EXCITED',
    icon: Smile,
    color: '#a855f7',
    description: 'Crescent arches or pulsing star pupils triggered by sentiment analysis.'
  },
  {
    trigger: 'Standby / Inactivity',
    state: 'IDLE',
    icon: Eye,
    color: '#8b5cf6',
    description: 'Relaxed capsule eyes with non-blocking natural blinking and saccades.'
  }
];

export function ExpressionsPage({ mood: initialMood, onMoodChange, isConnected = false }) {
  const [activeMood, setActiveMood] = useState(initialMood?.mood || 'IDLE');
  const [moodDetails, setMoodDetails] = useState({
    title: 'Calm Standby',
    description: 'Relaxed monitoring, occasional blinking and saccades.',
    valence: 75,
    energy: 50,
    focus: 60,
    auraColor: '#8b5cf6',
    esp32_synced: false
  });
  const [auraColor, setAuraColor] = useState('#a855f7');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [autoRevertSec, setAutoRevertSec] = useState(5);

  // Synchronize state when backend/telemetry updates
  useEffect(() => {
    let isMounted = true;

    async function loadMoodState() {
      try {
        const data = await getCurrentMood();
        if (isMounted && data) {
          const currentId = (data.mood || 'IDLE').toUpperCase();
          setActiveMood(currentId);
          setMoodDetails(prev => ({
            ...prev,
            ...data
          }));
          if (data.auraColor) {
            setAuraColor(data.auraColor);
          }
        }
      } catch (err) {
        console.warn('[ExpressionsPage] Could not fetch current mood:', err);
      }
    }

    loadMoodState();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update when parent props change (e.g. from telemetry WebSocket)
  useEffect(() => {
    if (initialMood?.mood && initialMood.mood !== activeMood) {
      setActiveMood(initialMood.mood);
      const def = MOOD_DEFINITIONS.find(m => m.id === initialMood.mood);
      if (def) {
        setMoodDetails(prev => ({
          ...prev,
          title: def.name,
          description: def.desc,
          valence: def.valence,
          energy: def.energy,
          auraColor: def.color
        }));
        setAuraColor(def.color);
      }
    }
  }, [initialMood]);

  // Handle user selecting an expression
  const handleSelectMood = async (moodId, tempDuration = null) => {
    const normalized = moodId.toUpperCase();
    const match = MOOD_DEFINITIONS.find(m => m.id === normalized);

    setActiveMood(normalized);
    if (match) {
      setAuraColor(match.color);
      setMoodDetails(prev => ({
        ...prev,
        title: match.name,
        description: match.desc,
        valence: match.valence,
        energy: match.energy,
        auraColor: match.color
      }));
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await setMood(normalized, tempDuration);
      const isEsp32Synced = res?.mood_state?.esp32_synced ?? false;

      if (onMoodChange) {
        onMoodChange({
          mood: normalized,
          moodTitle: match?.name || normalized,
          auraColor: match?.color || auraColor,
          esp32_synced: isEsp32Synced
        });
      }

      setSyncFeedback({
        success: true,
        message: isConnected
          ? `OLED Updated: ${normalized} commanded to physical rover.`
          : `UI Updated: ${normalized} previewed (Rover hardware offline).`,
        isHardware: isConnected
      });
    } catch (err) {
      console.error('[ExpressionsPage] Mood command failed:', err);
      setSyncFeedback({
        success: false,
        message: `Command failed: ${err.message || 'Network error'}`,
        isHardware: false
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Reset mood to IDLE
  const handleResetToIdle = () => {
    handleSelectMood('IDLE');
  };

  // Trigger temporary reaction
  const handleTemporaryReaction = (moodId) => {
    handleSelectMood(moodId, autoRevertSec);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-purple-500/20">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
              EXPRESSIONS & MOOD ENGINE
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-fuchsia-900/60 border border-fuchsia-400/50 text-fuchsia-300">
              SSD1306 OLED MATRIX
            </span>
          </div>
          <p className="text-sm font-mono text-slate-400 mt-1">
            Real-time affective computing, animated robot eyes, and hardware OLED screen synchronizer.
          </p>
        </div>

        {/* Quick Actions & Status Badge */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-2 ${
            isConnected
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-purple-950/60 border-purple-500/40 text-purple-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-purple-400'}`} />
            <span>{isConnected ? 'ESP32 OLED LINKED' : 'PREVIEW MODE'}</span>
          </div>

          <CyberButton
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={handleResetToIdle}
            disabled={isSyncing || activeMood === 'IDLE'}
          >
            RESET TO IDLE
          </CyberButton>
        </div>
      </div>

      {/* Sync Feedback Toast Alert */}
      <AnimatePresence>
        {syncFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
              syncFeedback.success
                ? syncFeedback.isHardware
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-purple-950/80 border-purple-500/50 text-purple-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            <span className="text-[10px] opacity-75">
              {syncFeedback.isHardware ? 'HARDWARE CONFIRMED' : 'FRONTEND EMULATION'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* ========================================================
            LEFT COLUMN (6 Cols): OLED Face Simulator & Behaviors
            ======================================================== */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* OLED Screen Simulator Card */}
          <GlassCard glowColor="purple" className="p-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-purple-500/20 mb-4">
              <span className="text-xs font-mono uppercase text-slate-300 flex items-center gap-2">
                <Smile className="w-4 h-4 text-purple-400" />
                ONBOARD OLED SCREEN (128x64px)
              </span>
              <span className="text-xs font-mono text-purple-300 font-bold">
                STATE: {activeMood}
              </span>
            </div>

            {/* High-Fidelity 128x64 Robot Eyes Visualizer */}
            <div className="w-full flex justify-center py-2">
              <OledEyesVisualizer
                mood={activeMood}
                auraColor={auraColor}
                isEsp32Connected={isConnected}
                className="w-full max-w-md"
              />
            </div>

            {/* Ambient Underglow Aura Lighting */}
            <div className="w-full mt-6 pt-4 border-t border-purple-500/20">
              <span className="text-xs font-mono text-slate-300 uppercase block mb-2.5">
                AMBIENT UNDERGLOW AURA ACCENT
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {AURA_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setAuraColor(c.hex)}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer
                      ${auraColor === c.hex 
                        ? 'border-white text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] bg-purple-950/40' 
                        : 'border-purple-500/20 text-slate-400 hover:text-white hover:border-purple-400/40'
                      }
                    `}
                  >
                    <span 
                      className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: c.hex, color: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Autonomous System Behavior Rules */}
          <GlassCard glowColor="purple" className="p-6">
            <div className="text-xs font-mono uppercase text-slate-300 mb-3 flex items-center gap-2 pb-2 border-b border-purple-500/20">
              <Activity className="w-4 h-4 text-purple-400" />
              AUTONOMOUS MOOD BEHAVIOR TRIGGERS
            </div>

            <div className="space-y-3">
              {AUTONOMOUS_RULES.map((rule, idx) => {
                const Icon = rule.icon;
                const isCurrentActive = 
                  (rule.state === activeMood) || 
                  (rule.state.includes(activeMood));

                return (
                  <div 
                    key={idx}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isCurrentActive 
                        ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                        : 'bg-cyber-void/40 border-purple-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-white font-semibold">
                        <Icon className="w-3.5 h-3.5" style={{ color: rule.color }} />
                        <span>{rule.trigger}</span>
                      </div>
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{ 
                          backgroundColor: `${rule.color}20`, 
                          borderColor: `${rule.color}60`, 
                          color: rule.color 
                        }}
                      >
                        ➔ {rule.state}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-1 pl-5.5">
                      {rule.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </GlassCard>

        </div>

        {/* ========================================================
            RIGHT COLUMN (6 Cols): Expression Selector & Telemetry
            ======================================================== */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Active Mood Status Banner & Metrics */}
          <GlassCard glowColor="magenta" className="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-fuchsia-500/20 mb-4">
              <div className="text-xs font-mono uppercase text-slate-300 flex items-center gap-2">
                <Heart className="w-4 h-4 text-fuchsia-400" />
                ACTIVE EMOTIONAL METRICS
              </div>
              <div className="text-xs font-mono text-fuchsia-300 flex items-center gap-1.5">
                {isSyncing ? (
                  <span className="flex items-center gap-1 text-fuchsia-400 animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    DISPATCHING TO ESP32...
                  </span>
                ) : isConnected ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5" />
                    ESP32 SYNCED
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5" />
                    SIMULATION ONLY
                  </span>
                )}
              </div>
            </div>

            {/* Primary Emotion Banner */}
            <div className="p-4 rounded-2xl bg-cyber-void/70 border border-fuchsia-500/30 mb-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-400 block mb-0.5">
                  CURRENT RESONANCE
                </span>
                <h3 className="font-orbitron font-extrabold text-xl text-white tracking-wide">
                  {moodDetails.title || activeMood}
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  {moodDetails.description}
                </p>
              </div>

              <div 
                className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center shadow-[0_0_20px_currentColor]"
                style={{ backgroundColor: `${auraColor}20`, borderColor: auraColor, color: auraColor }}
              >
                {(() => {
                  const activeDef = MOOD_DEFINITIONS.find(m => m.id === activeMood);
                  const Icon = activeDef ? (ICON_MAP[activeDef.icon] || Smile) : Smile;
                  return <Icon className="w-7 h-7" />;
                })()}
              </div>
            </div>

            {/* Affective Metrics Gauges */}
            <div className="space-y-4">
              {/* Valence Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-purple-400" />
                    VALENCE (POSITIVITY)
                  </span>
                  <span className="text-purple-300 font-bold">{moodDetails.valence || 75}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-cyber-void border border-purple-500/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${moodDetails.valence || 75}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-400 shadow-[0_0_8px_#a855f7]"
                  />
                </div>
              </div>

              {/* Energy Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
                    EMOTIONAL ENERGY
                  </span>
                  <span className="text-fuchsia-300 font-bold">{moodDetails.energy || 50}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-cyber-void border border-fuchsia-500/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${moodDetails.energy || 50}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-400 shadow-[0_0_8px_#d946ef]"
                  />
                </div>
              </div>

              {/* Focus Bar */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    ATTENTION & COGNITIVE FOCUS
                  </span>
                  <span className="text-cyan-300 font-bold">{moodDetails.focus || 60}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-cyber-void border border-cyan-500/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${moodDetails.focus || 60}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-teal-400 shadow-[0_0_8px_#06b6d4]"
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Interactive 9-State Expression Selector */}
          <GlassCard glowColor="purple" className="p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/20">
              <span className="text-xs font-mono uppercase text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                SELECT ROVER MOOD (9 MODES)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                CLICK TO DISPATCH
              </span>
            </div>

            {/* 3x3 Grid of Mood Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MOOD_DEFINITIONS.map((item) => {
                const Icon = ICON_MAP[item.icon] || Smile;
                const isSelected = activeMood === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectMood(item.id)}
                    disabled={isSyncing}
                    className={`
                      p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center font-mono transition-all duration-200 cursor-pointer relative group
                      ${isSelected 
                        ? 'bg-purple-950/90 border-white text-white shadow-[0_0_22px_rgba(168,85,247,0.5)] scale-[1.02]' 
                        : 'bg-cyber-void/70 border-purple-500/20 text-slate-300 hover:border-purple-400/60 hover:text-white hover:bg-purple-950/30'
                      }
                      ${isSyncing ? 'opacity-70 cursor-wait' : ''}
                    `}
                  >
                    {/* Active Indicator Pip */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-pulse" />
                    )}

                    {/* Mood Icon */}
                    <div 
                      className="p-2.5 rounded-xl mb-2 transition-transform group-hover:scale-110"
                      style={{ 
                        backgroundColor: `${item.color}25`, 
                        color: item.color,
                        boxShadow: isSelected ? `0 0 15px ${item.color}60` : 'none'
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Mood Title */}
                    <span className="font-orbitron font-bold text-xs tracking-wider">
                      {item.id}
                    </span>

                    <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {item.name}
                    </span>

                    {/* Micro Metrics */}
                    <div className="flex items-center gap-1.5 mt-2 text-[9px] text-slate-400">
                      <span>V:{item.valence}%</span>
                      <span>•</span>
                      <span>E:{item.energy}%</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Temporary Reaction Tester */}
            <div className="mt-5 pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-400" />
                TRIGGER TEMPORARY REACTION:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTemporaryReaction('EXCITED')}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/40 text-fuchsia-300 hover:border-fuchsia-300 cursor-pointer"
                >
                  5s EXCITED
                </button>
                <button
                  onClick={() => handleTemporaryReaction('THINKING')}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:border-cyan-300 cursor-pointer"
                >
                  5s THINKING
                </button>
                <button
                  onClick={() => handleTemporaryReaction('ANGRY')}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded-lg border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:border-rose-300 cursor-pointer"
                >
                  5s DEFENSE
                </button>
              </div>
            </div>

          </GlassCard>

        </div>

      </div>
    </div>
  );
}

export default ExpressionsPage;