/**
 * VIBESETTER OS - VoiceVisualizer Component
 * =========================================
 * Real-time audio frequency visualizer that renders pulsing neon equalizer
 * bars synchronized with speech input or AI synthesis playback.
 */

import React from 'react';
import { motion } from 'framer-motion';

export function VoiceVisualizer({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  barCount = 24,
  className = ''
}) {
  const active = isListening || isSpeaking;

  // Generate deterministic bar baseline heights
  const bars = Array.from({ length: barCount }, (_, index) => {
    // Symmetrical bell curve shape
    const mid = barCount / 2;
    const distFromMid = Math.abs(index - mid);
    const normalizedBell = Math.max(0.2, 1 - (distFromMid / mid) * 0.7);
    return normalizedBell;
  });

  return (
    <div className={`w-full flex items-center justify-center gap-1 sm:gap-1.5 h-12 px-4 rounded-xl bg-purple-950/20 border border-purple-500/20 overflow-hidden ${className}`}>
      {bars.map((bell, i) => {
        // Calculate dynamic height based on audioLevel and bell curve
        const dynamicHeightPercent = active
          ? Math.min(100, Math.max(15, (bell * 30) + (audioLevel * 100 * (0.8 + Math.random() * 0.4))))
          : 12;

        return (
          <motion.div
            key={i}
            animate={{
              height: active ? `${dynamicHeightPercent}%` : '12%',
              backgroundColor: isListening
                ? i % 2 === 0 ? '#e879f9' : '#c084fc'
                : isSpeaking
                ? i % 2 === 0 ? '#38bdf8' : '#818cf8'
                : '#581c87'
            }}
            transition={{
              duration: 0.1,
              ease: 'easeOut'
            }}
            className={`w-1 sm:w-1.5 rounded-full transition-all duration-75 ${
              active ? 'shadow-[0_0_8px_rgba(217,70,239,0.8)]' : 'opacity-40'
            }`}
          />
        );
      })}
    </div>
  );
}

export default VoiceVisualizer;

