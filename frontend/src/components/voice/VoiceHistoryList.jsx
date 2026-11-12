/**
 * VIBESETTER OS - VoiceHistoryList Component
 * ==========================================
 * Scrollable cyberpunk history feed displaying past voice interactions,
 * detected intents, structured parameters, and one-click re-execution triggers.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  Trash2, 
  RotateCcw, 
  User, 
  Bot, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import GlassCard from '../common/GlassCard';

export function VoiceHistoryList({
  history = [],
  onClearHistory,
  onRerunCommand
}) {
  return (
    <GlassCard glowColor="purple" className="p-4 sm:p-5 flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          <h3 className="font-orbitron font-bold text-sm text-white tracking-wide">
            COMMAND HISTORY
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300">
            {history.length}
          </span>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="text-xs font-mono text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            title="Clear voice history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR
          </button>
        )}
      </div>

      {/* History Items Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-8">
            <History className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs font-mono">No voice commands in session yet.</p>
            <p className="text-[11px] font-mono text-slate-600 mt-1">Speak into the microphone or test a suggested command.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {history.slice().reverse().map((item) => {
              const isEmergency = item.intent === 'EMERGENCY_STOP';
              const isBlocked = item.action === 'EXECUTION_BLOCKED_OFFLINE';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl bg-cyber-void/80 border border-purple-500/20 hover:border-purple-400/40 transition-colors"
                >
                  {/* Top Bar: Intent & Time */}
                  <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] font-mono text-slate-400">
                    <span className={`px-2 py-0.5 rounded uppercase font-bold ${
                      isEmergency
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        : isBlocked
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                        : 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                    }`}>
                      {item.intent || 'VOICE'}
                    </span>
                    <span>{item.timestamp}</span>
                  </div>

                  {/* Spoken Query */}
                  <div className="flex items-start gap-2 my-1">
                    <div className="w-5 h-5 rounded bg-purple-900/60 border border-purple-400/40 flex items-center justify-center shrink-0 text-purple-200 mt-0.5">
                      <User className="w-3 h-3" />
                    </div>
                    <p className="text-xs font-mono text-purple-100 flex-1 leading-snug">
                      "{item.transcript}"
                    </p>
                  </div>

                  {/* AI Response Preview */}
                  <div className="flex items-start gap-2 my-1 pl-1">
                    <div className="w-5 h-5 rounded bg-indigo-950/80 border border-indigo-400/40 flex items-center justify-center shrink-0 text-indigo-300 mt-0.5">
                      <Bot className="w-3 h-3" />
                    </div>
                    <p className="text-xs font-rajdhani text-slate-300 flex-1 line-clamp-2 leading-snug">
                      {item.response}
                    </p>
                  </div>

                  {/* Footer Action & Rerun Button */}
                  <div className="mt-2 pt-2 border-t border-purple-500/10 flex items-center justify-between">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      {item.executed ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Executed
                        </span>
                      ) : isBlocked ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> ESP32 Offline
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {item.action}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onRerunCommand && onRerunCommand(item.transcript)}
                      className="text-[10px] font-mono text-purple-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 transition-all cursor-pointer"
                      title="Re-run this command"
                    >
                      <RotateCcw className="w-3 h-3" />
                      RE-RUN
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </GlassCard>
  );
}

export default VoiceHistoryList;

