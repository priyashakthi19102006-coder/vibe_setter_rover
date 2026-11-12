/**
 * VIBESETTER OS - VoiceMicButton Component
 * ========================================
 * Large central futuristic microphone trigger with concentric cyber rings,
 * pulsing audio aura, and state-reactive glowing animations.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, Volume2, ShieldAlert } from 'lucide-react';

export function VoiceMicButton({
  isListening = false,
  isProcessing = false,
  isSpeaking = false,
  hasError = false,
  audioLevel = 0,
  onClick,
  disabled = false
}) {
  // Determine state labels & colors
  let stateLabel = 'TAP TO SPEAK';
  let subLabel = 'Press Space or Click to Start';
  let ringColor = 'border-purple-500/40';
  let glowShadow = 'shadow-[0_0_30px_rgba(168,85,247,0.35)]';

  if (hasError) {
    stateLabel = 'MIC RESTRICTED';
    subLabel = 'Check browser microphone permissions';
    ringColor = 'border-rose-500/60';
    glowShadow = 'shadow-[0_0_35px_rgba(244,63,94,0.5)]';
  } else if (isProcessing) {
    stateLabel = 'NEURAL PROCESSING';
    subLabel = 'Classifying intent & validating safety...';
    ringColor = 'border-cyan-400/80';
    glowShadow = 'shadow-[0_0_40px_rgba(6,182,212,0.6)]';
  } else if (isListening) {
    stateLabel = 'LISTENING...';
    subLabel = 'Speak command or ask questions';
    ringColor = 'border-fuchsia-400';
    glowShadow = 'shadow-[0_0_50px_rgba(217,70,239,0.7)]';
  } else if (isSpeaking) {
    stateLabel = 'COMPANION SPEAKING';
    subLabel = 'Audio synthesizer output active';
    ringColor = 'border-violet-400';
    glowShadow = 'shadow-[0_0_40px_rgba(139,92,246,0.6)]';
  }

  // Dynamic scale from live microphone audio level
  const dynamicScale = isListening ? 1 + Math.min(audioLevel * 0.4, 0.25) : 1;

  return (
    <div className="flex flex-col items-center justify-center my-4 select-none">
      <div className="relative flex items-center justify-center">
        
        {/* Outer concentric rotating radar ring 1 */}
        <motion.div
          animate={{ rotate: isListening ? 360 : 0 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-dashed ${
            isListening ? 'border-fuchsia-500/50' : 'border-purple-500/20'
          } pointer-events-none`}
        />

        {/* Outer concentric pulsing ring 2 */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-fuchsia-400/60 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Secondary pulse ripple when processing */}
        {isProcessing && (
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-cyan-400 border-l-transparent pointer-events-none"
          />
        )}

        {/* Central Interactive Core Button */}
        <motion.button
          type="button"
          onClick={onClick}
          disabled={disabled}
          animate={{ scale: dynamicScale }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full 
            flex flex-col items-center justify-center 
            transition-colors duration-300 cursor-pointer
            ${ringColor} border-2 ${glowShadow}
            ${
              hasError
                ? 'bg-rose-950/70 text-rose-300'
                : isListening
                ? 'bg-gradient-to-tr from-fuchsia-900/90 to-purple-900/90 text-white'
                : isProcessing
                ? 'bg-gradient-to-tr from-cyan-950/90 to-blue-950/90 text-cyan-200'
                : isSpeaking
                ? 'bg-gradient-to-tr from-violet-900/90 to-purple-950/90 text-violet-200'
                : 'bg-cyber-void/90 text-purple-300 hover:text-white hover:bg-purple-950/60'
            }
          `}
          aria-label={stateLabel}
          title="Click to toggle voice listening (Spacebar shortcut)"
        >
          {/* Main State Icon */}
          <div className="relative">
            {hasError ? (
              <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400 animate-bounce" />
            ) : isProcessing ? (
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 animate-spin" />
            ) : isSpeaking ? (
              <Volume2 className="w-10 h-10 sm:w-12 sm:h-12 text-violet-300 animate-pulse" />
            ) : isListening ? (
              <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-pulse" />
            ) : (
              <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" />
            )}
          </div>

          {/* Under-icon micro indicator */}
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest mt-1 uppercase">
            {isListening ? 'LIVE' : isProcessing ? 'CALC' : isSpeaking ? 'AUDIO' : 'VOICE'}
          </span>
        </motion.button>
      </div>

      {/* State Label & Guidance */}
      <div className="mt-4 text-center">
        <div className={`font-orbitron font-bold text-base sm:text-lg tracking-wider ${
          hasError
            ? 'text-rose-400'
            : isListening
            ? 'text-fuchsia-300 text-glow-purple'
            : isProcessing
            ? 'text-cyan-300'
            : isSpeaking
            ? 'text-violet-300'
            : 'text-white'
        }`}>
          {stateLabel}
        </div>
        <div className="text-xs font-mono text-slate-400 mt-0.5">
          {subLabel}
        </div>
      </div>
    </div>
  );
}

export default VoiceMicButton;

