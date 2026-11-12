/**
 * VIBESETTER OS - VoiceResponseCard Component
 * ===========================================
 * Showcases the neural AI response, intent classification, safety validation status,
 * parameter extraction details, interactive quick-reply clarification chips,
 * and audio playback for local Ollama 3B + TTS synthesis.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  ShieldAlert, 
  Compass, 
  HelpCircle,
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  AudioLines
} from 'lucide-react';
import GlassCard from '../common/GlassCard';

export function VoiceResponseCard({
  response = null,
  isProcessing = false,
  isSpeaking = false,
  isPlayingAudio = false,
  ttsEnabled = true,
  onToggleTts,
  onReplayTts,
  onPlayServerAudio,
  onSelectClarificationChip
}) {
  if (isProcessing) {
    return (
      <GlassCard glowColor="cyan" className="p-5 flex flex-col items-center justify-center min-h-[160px] text-center">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3" />
        <h4 className="font-orbitron font-bold text-sm text-cyan-300 tracking-wider">
          NEURAL PIPELINE & OLLAMA INFERENCE
        </h4>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Evaluating intent, safety boundaries & generating companion speech audio...
        </p>
      </GlassCard>
    );
  }

  if (!response) {
    return (
      <GlassCard glowColor="purple" className="p-5 flex flex-col items-center justify-center min-h-[160px] text-center text-slate-400">
        <Bot className="w-8 h-8 text-purple-400/60 mb-2" />
        <h4 className="font-orbitron font-semibold text-sm text-slate-300">
          AI COMPANION STANDING BY
        </h4>
        <p className="text-xs font-mono text-slate-400 mt-1 max-w-sm">
          Speak a command or tap a suggestion below. Ollama 3B generates friendly personality responses. Rover movement is strictly safety-validated.
        </p>
      </GlassCard>
    );
  }

  const {
    transcript = '',
    intent = 'GENERAL_CONVERSATION',
    action = 'AI_CHAT',
    response: replyText = '',
    needs_clarification = false,
    command_payload = {},
    executed = false,
    audio_url = null
  } = response;

  // Determine intent badge color
  const isEmergency = intent === 'EMERGENCY_STOP';
  const isClarification = needs_clarification || action === 'REQUEST_CLARIFICATION';
  const isSafetyReject = action === 'SAFETY_REJECTION';
  const isBlocked = action === 'EXECUTION_BLOCKED_OFFLINE';
  const isChat = intent === 'GENERAL_CONVERSATION';

  return (
    <GlassCard 
      glowColor={isEmergency ? 'magenta' : isClarification ? 'purple' : isSafetyReject ? 'magenta' : 'purple'} 
      className="p-5 relative overflow-hidden"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-400/50 flex items-center justify-center text-purple-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="font-orbitron font-bold text-sm text-white tracking-wide block">
              VIBESETTER COMPANION
            </span>
            {isChat && (
              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Ollama 3B Brain
              </span>
            )}
          </div>
        </div>

        {/* Action Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
            isEmergency 
              ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.4)]' 
              : isClarification 
              ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
              : isSafetyReject 
              ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
              : 'bg-purple-950/80 border-purple-400/50 text-purple-300'
          }`}>
            INTENT: {intent}
          </span>

          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
            executed
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
              : isBlocked
              ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
              : isClarification
              ? 'bg-purple-950/80 border-purple-500/60 text-purple-300'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}>
            {action}
          </span>

          {/* TTS Speaker Toggle Button */}
          <button
            type="button"
            onClick={onToggleTts}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              ttsEnabled 
                ? 'bg-purple-900/60 border-purple-400/60 text-purple-200' 
                : 'bg-slate-900/60 border-slate-700 text-slate-500'
            }`}
            title={ttsEnabled ? 'Mute AI voice output' : 'Enable AI voice output'}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Verbal / Text Response */}
      <div className="my-3.5">
        <p className="text-base sm:text-lg font-rajdhani font-semibold text-purple-100 leading-relaxed">
          "{replyText}"
        </p>

        {/* Audio speaking indicator */}
        {(isSpeaking || isPlayingAudio) && (
          <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-cyan-300 animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            {isPlayingAudio ? 'Streaming synthesized rover speech audio (.wav)...' : 'Synthesizing speech response...'}
          </div>
        )}
      </div>

      {/* Structured Parameters Breakdown if present */}
      {command_payload && Object.keys(command_payload).length > 0 && (
        <div className="p-3 rounded-lg bg-cyber-void/80 border border-purple-500/20 my-3 text-xs font-mono text-slate-300 flex flex-wrap gap-4 items-center">
          <span className="text-purple-400 font-bold uppercase flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> PARAMETERS:
          </span>
          {command_payload.direction && (
            <span>Direction: <strong className="text-white uppercase">{command_payload.direction}</strong></span>
          )}
          {command_payload.distance_cm !== undefined && (
            <span>Distance: <strong className="text-white">{command_payload.distance_cm !== null ? `${command_payload.distance_cm} cm` : 'UNSPECIFIED'}</strong></span>
          )}
          {command_payload.angle !== undefined && (
            <span>Angle: <strong className="text-white">{command_payload.angle !== null ? `${command_payload.angle}°` : 'UNSPECIFIED'}</strong></span>
          )}
          {command_payload.expression && (
            <span>Expression: <strong className="text-white uppercase">{command_payload.expression}</strong></span>
          )}
        </div>
      )}

      {/* INTERACTIVE CLARIFICATION CHIPS */}
      {isClarification && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30"
        >
          <div className="flex items-center gap-2 text-xs font-mono text-amber-300 mb-2">
            <HelpCircle className="w-4 h-4" />
            <span>Missing parameter detected. Click a suggested value or speak it aloud:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {intent.includes('TURN') ? (
              // Rotation clarification chips
              ['45 degrees', '90 degrees', '180 degrees'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onSelectClarificationChip && onSelectClarificationChip(chip)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-purple-900/60 border border-purple-400/50 text-purple-200 hover:bg-purple-800 hover:border-purple-300 transition-all cursor-pointer shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                >
                  ⚡ {chip}
                </button>
              ))
            ) : (
              // Distance clarification chips
              ['10 cm', '25 cm', '50 cm', '1 meter'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onSelectClarificationChip && onSelectClarificationChip(chip)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-purple-900/60 border border-purple-400/50 text-purple-200 hover:bg-purple-800 hover:border-purple-300 transition-all cursor-pointer shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                >
                  📍 {chip}
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Hardware Execution / Audio Streaming Footer */}
      <div className="mt-3 pt-3 border-t border-purple-500/15 flex items-center justify-between text-[11px] font-mono text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {executed ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Hardware ACK Confirmed
            </span>
          ) : isBlocked ? (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Motion Blocked: ESP32 Offline
            </span>
          ) : isSafetyReject ? (
            <span className="text-rose-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Safety Limit Rejection
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Safety Isolation Active
            </span>
          )}
        </div>

        {/* Audio Action Buttons */}
        <div className="flex items-center gap-2">
          {audio_url && (
            <button
              type="button"
              onClick={() => onPlayServerAudio && onPlayServerAudio(audio_url)}
              className="text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/50 border border-cyan-400/40 hover:bg-cyan-900/60 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              title="Play backend-synthesized speech audio"
            >
              <AudioLines className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-bounce text-cyan-200' : ''}`} />
              <span>{isPlayingAudio ? 'Playing...' : 'Play Audio (.wav)'}</span>
            </button>
          )}

          {replyText && !audio_url && (
            <button
              type="button"
              onClick={onReplayTts}
              className="text-purple-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-xs"
              title="Replay browser voice"
            >
              <Volume2 className="w-3.5 h-3.5" /> Repeat Voice
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default VoiceResponseCard;
