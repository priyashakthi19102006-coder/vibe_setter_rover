/**
 * VIBESETTER OS - AI Companion Status Card
 * ========================================
 * Displays local Ollama 3B model connectivity, response latency, active
 * companion personality, and TTS speech synthesis metrics.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Cpu, 
  Mic, 
  Clock, 
  MessageSquare,
  Volume2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import GlassCard from '../common/GlassCard';
import MetricIndicator from '../common/MetricIndicator';
import StatusBadge from '../common/StatusBadge';
import CyberButton from '../common/CyberButton';

export function AiCompanionCard({
  aiStatus = {
    model: 'qwen2.5:3b',
    status: 'ONLINE',
    personality: 'VIBESETTER Cyber Companion',
    ollama: {
      connected: true,
      model: 'qwen2.5:3b',
      latency_ms: 85.0
    },
    tts: {
      status: 'ONLINE',
      engine: 'pyttsx3'
    }
  },
  onOpenVoiceTab
}) {
  const isOllamaConnected = aiStatus?.ollama?.connected ?? (aiStatus?.status === 'ONLINE');
  const modelName = aiStatus?.ollama?.model || aiStatus?.model || 'qwen2.5:3b';
  const latency = aiStatus?.ollama?.latency_ms || aiStatus?.responseLatencyMs || 85;

  return (
    <GlassCard glowColor="purple" className="p-5 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base tracking-wide text-white">
                AI COMPANION BRAIN
              </h3>
              <p className="text-[11px] font-mono text-purple-300/80">
                LOCAL OLLAMA 3B & TTS SYNTHESIS
              </p>
            </div>
          </div>

          <StatusBadge 
            status={isOllamaConnected ? 'OLLAMA ONLINE' : 'LOCAL FALLBACK'} 
            variant={isOllamaConnected ? 'online' : 'warning'} 
            size="sm" 
          />
        </div>

        {/* Neural Model Banner */}
        <div className="p-3 mb-3 rounded-xl bg-purple-950/20 border border-purple-500/20">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              LOCAL LLM MODEL
            </span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
              isOllamaConnected 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}>
              {isOllamaConnected ? '3B QUANTIZED' : 'OFFLINE'}
            </span>
          </div>

          <div className="font-orbitron text-sm sm:text-base font-bold text-white mt-1 text-glow-purple flex items-center justify-between">
            <span>{modelName}</span>
            <span className="text-xs font-mono text-slate-400 font-normal">Ollama Core</span>
          </div>

          {/* Personality pill */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-purple-500/10 text-xs font-mono">
            <span className="text-slate-400">PERSONA:</span>
            <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-400/40 text-purple-300 font-semibold truncate max-w-[200px]">
              {aiStatus.personality || 'VibeSetter Rover Companion'}
            </span>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          <MetricIndicator
            label="Ollama Latency"
            value={latency}
            unit="ms"
            icon={Clock}
            color="cyan"
            progress={Math.min(100, Math.max(10, (latency / 500) * 100))}
          />

          <div className="flex flex-col p-3 rounded-lg bg-cyber-void/60 border border-purple-500/15">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                <span>TTS ENGINE</span>
              </span>
            </div>
            <div className="font-orbitron text-xs sm:text-sm font-bold text-white mt-0.5 uppercase">
              {aiStatus?.tts?.engine || 'PYTTSX3 WAV'}
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Audio Stream Ready
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-3 border-t border-purple-500/15 flex items-center justify-between">
        <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Conversational Brain Active</span>
        </div>

        <CyberButton
          variant="secondary"
          size="sm"
          icon={MessageSquare}
          onClick={onOpenVoiceTab}
        >
          CHAT WITH AI
        </CyberButton>
      </div>
    </GlassCard>
  );
}

export default AiCompanionCard;
