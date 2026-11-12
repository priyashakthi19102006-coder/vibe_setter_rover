/**
 * VIBESETTER OS - OledEyesVisualizer Component
 * ============================================
 * High-fidelity 128x64 OLED robot eye simulator that renders the exact eye geometry
 * and non-blocking animation states implemented on the ESP32 SSD1306 hardware.
 * 
 * Eye States:
 * - HAPPY, EXCITED, SAD, ANGRY, SLEEPY, THINKING, LISTENING, TALKING, IDLE
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function OledEyesVisualizer({
  mood = 'IDLE',
  auraColor = '#a855f7',
  isEsp32Connected = false,
  className = ''
}) {
  const [blinkPhase, setBlinkPhase] = useState(false);
  const [saccadeOffset, setSaccadeOffset] = useState(0);

  // Non-blocking blink loop simulation for IDLE mode
  useEffect(() => {
    if (mood !== 'IDLE') {
      setBlinkPhase(false);
      return;
    }

    const blinkInterval = setInterval(() => {
      setBlinkPhase(true);
      setTimeout(() => setBlinkPhase(false), 140);
    }, 3800);

    // Random saccadic look-around
    const saccadeInterval = setInterval(() => {
      const offsets = [0, -6, 0, 6, 0];
      const randomOffset = offsets[Math.floor(Math.random() * offsets.length)];
      setSaccadeOffset(randomOffset);
    }, 2200);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(saccadeInterval);
    };
  }, [mood]);

  // Render eye content based on mood
  const renderEyes = () => {
    switch (mood) {
      case 'HAPPY':
        return (
          <div className="flex items-center gap-10">
            {/* Left Eye: Upward curved crescent arch */}
            <div className="relative w-14 h-14 overflow-hidden">
              <div 
                className="w-14 h-14 rounded-full border-4 border-white"
                style={{ backgroundColor: auraColor }}
              />
              <div className="absolute inset-x-0 bottom-0 h-7 bg-cyber-void" />
              <div className="absolute bottom-1 inset-x-3 h-0.5 bg-white/80 rounded" />
            </div>

            {/* Right Eye: Upward curved crescent arch */}
            <div className="relative w-14 h-14 overflow-hidden">
              <div 
                className="w-14 h-14 rounded-full border-4 border-white"
                style={{ backgroundColor: auraColor }}
              />
              <div className="absolute inset-x-0 bottom-0 h-7 bg-cyber-void" />
              <div className="absolute bottom-1 inset-x-3 h-0.5 bg-white/80 rounded" />
            </div>
          </div>
        );

      case 'EXCITED':
        return (
          <div className="flex items-center gap-10">
            {/* Left Eye: Wide glowing circle with sparkling pupil */}
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-[0_0_20px_currentColor]"
              style={{ backgroundColor: auraColor, color: auraColor }}
            >
              <div className="w-5 h-5 rounded-full bg-cyber-void flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
              </div>
            </motion.div>

            {/* Right Eye */}
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-[0_0_20px_currentColor]"
              style={{ backgroundColor: auraColor, color: auraColor }}
            >
              <div className="w-5 h-5 rounded-full bg-cyber-void flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
              </div>
            </motion.div>
          </div>
        );

      case 'ANGRY':
        return (
          <div className="flex items-center gap-10">
            {/* Left Eye: Inward sharp angular combat wedge */}
            <div 
              className="w-14 h-14 rounded-xl relative overflow-hidden border-3 border-white shadow-[0_0_15px_#f43f5e]"
              style={{ backgroundColor: '#f43f5e' }}
            >
              <div className="absolute top-0 right-0 w-14 h-8 bg-cyber-void -rotate-25 origin-top-right" />
              <div className="absolute bottom-2 left-3 w-3 h-3 rounded-full bg-white" />
            </div>

            {/* Right Eye */}
            <div 
              className="w-14 h-14 rounded-xl relative overflow-hidden border-3 border-white shadow-[0_0_15px_#f43f5e]"
              style={{ backgroundColor: '#f43f5e' }}
            >
              <div className="absolute top-0 left-0 w-14 h-8 bg-cyber-void rotate-25 origin-top-left" />
              <div className="absolute bottom-2 right-3 w-3 h-3 rounded-full bg-white" />
            </div>
          </div>
        );

      case 'SLEEPY':
        return (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-10">
              {/* Left Eye: Heavy half-closed eyelid */}
              <div 
                className="w-14 h-4 rounded-full border-2 border-white shadow-[0_0_10px_currentColor]"
                style={{ backgroundColor: auraColor, color: auraColor }}
              />
              {/* Right Eye */}
              <div 
                className="w-14 h-4 rounded-full border-2 border-white shadow-[0_0_10px_currentColor]"
                style={{ backgroundColor: auraColor, color: auraColor }}
              />
            </div>
            {/* Floating Zzz */}
            <motion.div
              animate={{ y: [0, -10], opacity: [0.3, 1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="text-xs font-mono font-bold text-indigo-300 mt-2 self-end mr-6"
            >
              z Z z
            </motion.div>
          </div>
        );

      case 'THINKING':
        return (
          <div className="flex items-center gap-10 relative">
            {/* Scanning pupils moving horizontally */}
            <div 
              className="w-14 h-14 rounded-2xl border-3 border-white flex items-center justify-center relative overflow-hidden shadow-[0_0_15px_#06b6d4]"
              style={{ backgroundColor: '#06b6d420' }}
            >
              <motion.div
                animate={{ x: [-12, 12, -12] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-6 h-8 rounded-lg bg-cyan-300 shadow-[0_0_12px_#06b6d4]"
              />
              {/* Scanline */}
              <motion.div
                animate={{ y: [-20, 20, -20] }}
                transition={{ duration: 1.0, repeat: Infinity }}
                className="absolute inset-x-0 h-0.5 bg-white/80"
              />
            </div>

            {/* Right Eye */}
            <div 
              className="w-14 h-14 rounded-2xl border-3 border-white flex items-center justify-center relative overflow-hidden shadow-[0_0_15px_#06b6d4]"
              style={{ backgroundColor: '#06b6d420' }}
            >
              <motion.div
                animate={{ x: [-12, 12, -12] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-6 h-8 rounded-lg bg-cyan-300 shadow-[0_0_12px_#06b6d4]"
              />
              <motion.div
                animate={{ y: [-20, 20, -20] }}
                transition={{ duration: 1.0, repeat: Infinity }}
                className="absolute inset-x-0 h-0.5 bg-white/80"
              />
            </div>
          </div>
        );

      case 'LISTENING':
        return (
          <div className="flex flex-col items-center">
            {/* Acoustic radar waves above eyes */}
            <div className="flex items-center gap-14 mb-2">
              <motion.div
                animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.0, repeat: Infinity }}
                className="w-3 h-3 rounded-full border-2 border-fuchsia-400"
              />
              <motion.div
                animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.0, repeat: Infinity }}
                className="w-3 h-3 rounded-full border-2 border-fuchsia-400"
              />
            </div>

            <div className="flex items-center gap-10">
              {/* Left Eye */}
              <div 
                className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center shadow-[0_0_15px_#ec4899]"
                style={{ backgroundColor: auraColor }}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
              </div>
              {/* Right Eye */}
              <div 
                className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center shadow-[0_0_15px_#ec4899]"
                style={{ backgroundColor: auraColor }}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
              </div>
            </div>
          </div>
        );

      case 'TALKING':
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-10">
              {/* Expressive Eye capsules */}
              <div 
                className="w-13 h-13 rounded-2xl border-3 border-white flex items-center justify-center shadow-[0_0_15px_#10b981]"
                style={{ backgroundColor: auraColor }}
              >
                <div className="w-4 h-4 rounded-full bg-white" />
              </div>
              <div 
                className="w-13 h-13 rounded-2xl border-3 border-white flex items-center justify-center shadow-[0_0_15px_#10b981]"
                style={{ backgroundColor: auraColor }}
              >
                <div className="w-4 h-4 rounded-full bg-white" />
              </div>
            </div>

            {/* Dynamic Talking Vocal Mouth */}
            <div className="flex items-center gap-1 mt-1">
              {[0.4, 0.9, 1.3, 0.8, 0.4].map((scale, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [scale, 0.3, scale] }}
                  transition={{ duration: 0.25, repeat: Infinity, delay: i * 0.05 }}
                  className="w-2 h-4 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"
                />
              ))}
            </div>
          </div>
        );

      case 'SAD':
        return (
          <div className="flex items-center gap-10">
            {/* Left Eye: Outer droop */}
            <div 
              className="w-14 h-14 rounded-xl relative overflow-hidden border-3 border-white shadow-[0_0_15px_#3b82f6]"
              style={{ backgroundColor: '#3b82f6' }}
            >
              <div className="absolute top-0 left-0 w-14 h-8 bg-cyber-void rotate-25 origin-top-left" />
              <div className="absolute bottom-2 right-3 w-3 h-3 rounded-full bg-white" />
            </div>

            {/* Right Eye */}
            <div 
              className="w-14 h-14 rounded-xl relative overflow-hidden border-3 border-white shadow-[0_0_15px_#3b82f6]"
              style={{ backgroundColor: '#3b82f6' }}
            >
              <div className="absolute top-0 right-0 w-14 h-8 bg-cyber-void -rotate-25 origin-top-right" />
              <div className="absolute bottom-2 left-3 w-3 h-3 rounded-full bg-white" />
            </div>
          </div>
        );

      case 'IDLE':
      default:
        return (
          <div className="flex items-center gap-10">
            {/* Left Eye: Standard capsule with non-blocking blink */}
            <motion.div
              animate={{ 
                scaleY: blinkPhase ? 0.08 : 1,
                x: saccadeOffset
              }}
              transition={{ duration: 0.12 }}
              className="w-14 h-16 rounded-3xl border-3 border-white flex items-center justify-center relative shadow-[0_0_18px_currentColor]"
              style={{ backgroundColor: auraColor, color: auraColor }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
            </motion.div>

            {/* Right Eye */}
            <motion.div
              animate={{ 
                scaleY: blinkPhase ? 0.08 : 1,
                x: saccadeOffset
              }}
              transition={{ duration: 0.12 }}
              className="w-14 h-16 rounded-3xl border-3 border-white flex items-center justify-center relative shadow-[0_0_18px_currentColor]"
              style={{ backgroundColor: auraColor, color: auraColor }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
            </motion.div>
          </div>
        );
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      
      {/* Outer Rover Hardware Visor Bezel */}
      <div 
        className="relative w-full max-w-lg aspect-[16/10] rounded-[32px] bg-cyber-bg border-4 border-purple-500/40 p-5 flex flex-col items-center justify-between shadow-[0_0_40px_rgba(168,85,247,0.4),inset_0_0_30px_rgba(168,85,247,0.2)] transition-shadow duration-500"
        style={{ borderColor: `${auraColor}80`, boxShadow: `0 0 45px ${auraColor}40, inset 0 0 25px ${auraColor}20` }}
      >
        {/* Top Hardware Bezel Header */}
        <div className="w-full flex items-center justify-between px-2 pt-1 pb-2 border-b border-purple-500/20 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            SSD1306 OLED (128x64px)
          </span>
          <span className="text-white font-bold">
            {isEsp32Connected ? '● HARDWARE LINKED' : '○ SIMULATED VISOR'}
          </span>
        </div>

        {/* OLED Screen Inner Area (with CRT Scanlines) */}
        <div className="relative w-full flex-1 rounded-2xl bg-cyber-void border border-purple-500/30 flex flex-col items-center justify-center overflow-hidden my-2">
          
          {/* Subtle CRT Matrix Grid */}
          <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none" />

          {/* Render Animated Eyes */}
          <div className="relative z-10 flex items-center justify-center py-4">
            {renderEyes()}
          </div>

          {/* On-screen micro telemetry footer */}
          <div className="absolute bottom-1.5 inset-x-4 flex justify-between text-[10px] font-mono text-purple-300/80 pointer-events-none">
            <span>MOOD: <strong className="text-white uppercase">{mood}</strong></span>
            <span>OLED: 30 FPS</span>
          </div>
        </div>

        {/* Bottom Visor Status Label */}
        <div className="w-full text-center pb-0.5 text-xs font-orbitron font-bold tracking-widest text-white uppercase">
          VIBESETTER OS EYE MATRIX
        </div>
      </div>
    </div>
  );
}

export default OledEyesVisualizer;

