/**
 * VIBESETTER OS - Hero Section & Animated Rover Visualizer
 * 
 * Features:
 * - Holographic animated AI companion rover cyber-visor / face
 * - Orbital radar rings & scanning laser line
 * - "VIBESETTER OS" glowing title & cyberpunk typography
 * - "Your AI Companion. Your Mood. Your Vibe." signature subtitle
 * - Interactive mood reactive status aura
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Radio, Shield, Heart } from 'lucide-react';

export function HeroVisualizer({
  currentMood: rawMood,
  onTriggerCheer
}) {
  const currentMood = rawMood || { 
    moodTitle: 'Ambient Standby', 
    auraColor: '#a855f7', 
    activeExpression: 'IDLE' 
  };
  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 overflow-hidden">
      
      {/* Background Ambient Radial Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full blur-[120px] pointer-events-none opacity-40 transition-colors duration-700"
        style={{ background: currentMood?.auraColor || '#a855f7' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        
        {/* Top Status Capsule */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 backdrop-blur-md mb-6 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400" />
          </span>
          <span className="text-xs font-mono tracking-widest text-purple-300 uppercase">
            AUTONOMOUS ROVER LINK // CORE ONLINE
          </span>
        </motion.div>

        {/* --- ANIMATED HOLOGRAPHIC ROVER VISUAL PLACEHOLDER --- */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2 select-none">
          
          {/* Outer Rotating Radar Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-purple-500/20 border-dashed"
          />

          {/* Inner Counter-Rotating Hex Ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 rounded-full border border-cyan-500/25 border-t-purple-500/60"
          />

          {/* Pulsing Aura Sphere */}
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-8 rounded-full bg-gradient-to-tr from-purple-900/30 via-indigo-800/20 to-purple-600/30 blur-md border border-purple-400/30"
          />

          {/* Futuristic Rover Head / Visor Chassis */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-20 flex flex-col items-center justify-center w-48 h-40 sm:w-52 sm:h-44 rounded-3xl bg-cyber-bg/90 border-2 border-purple-400/60 backdrop-blur-2xl shadow-[0_0_35px_rgba(168,85,247,0.5),inset_0_0_20px_rgba(168,85,247,0.2)] p-4"
          >
            {/* Top Rover Sensor Array Antenna */}
            <div className="absolute -top-4 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-950 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[9px] font-mono tracking-widest text-purple-200">AI-LIDAR 360°</span>
            </div>

            {/* Glowing Digital Cyber Face Visor */}
            <div className="relative w-full h-24 rounded-2xl bg-cyber-void/90 border border-purple-500/40 p-2 flex items-center justify-center overflow-hidden shadow-inner">
              
              {/* Scanline line passing vertically */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent pointer-events-none animate-scanline" />

              {/* Rover Cyber Eyes Matrix */}
              <div className="flex items-center justify-center gap-6 z-10">
                {/* Left Eye */}
                <motion.div
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1, 1],
                    boxShadow: [
                      '0 0 15px rgba(168,85,247,0.9)',
                      '0 0 25px rgba(192,132,252,1)',
                      '0 0 10px rgba(168,85,247,0.5)',
                      '0 0 25px rgba(192,132,252,1)',
                      '0 0 15px rgba(168,85,247,0.9)'
                    ]
                  }}
                  transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
                  className="w-8 h-10 rounded-xl bg-gradient-to-b from-purple-300 via-purple-500 to-indigo-500 flex items-center justify-center border border-purple-200"
                >
                  <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                </motion.div>

                {/* Center Audio/Emotion Wave */}
                <div className="flex items-center gap-1 h-6">
                  {[0.4, 0.9, 0.6, 1.0, 0.5].map((scale, i) => (
                    <motion.span
                      key={i}
                      animate={{ scaleY: [scale, 1.2, scale * 0.5, scale] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1 h-full rounded-full bg-purple-400"
                    />
                  ))}
                </div>

                {/* Right Eye */}
                <motion.div
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1, 1],
                    boxShadow: [
                      '0 0 15px rgba(168,85,247,0.9)',
                      '0 0 25px rgba(192,132,252,1)',
                      '0 0 10px rgba(168,85,247,0.5)',
                      '0 0 25px rgba(192,132,252,1)',
                      '0 0 15px rgba(168,85,247,0.9)'
                    ]
                  }}
                  transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
                  className="w-8 h-10 rounded-xl bg-gradient-to-b from-purple-300 via-purple-500 to-indigo-500 flex items-center justify-center border border-purple-200"
                >
                  <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                </motion.div>
              </div>

              {/* Bottom Cheek LEDs */}
              <div className="absolute bottom-1.5 inset-x-4 flex justify-between text-[8px] font-mono text-purple-400/80">
                <span className="tracking-tighter">MOOD: VIBE</span>
                <span className="tracking-tighter">OLED: 120HZ</span>
              </div>
            </div>

            {/* Rover Chin & Grille Lighting */}
            <div className="flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="w-12 h-1 rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            </div>
          </motion.div>

          {/* Holographic Base Plate */}
          <div className="absolute -bottom-2 w-48 h-6 rounded-[100%] bg-purple-500/20 blur-md border border-purple-500/40" />
        </div>

        {/* --- MAIN TITLE & SUBTITLE --- */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-3 max-w-2xl"
        >
          <h1 className="font-orbitron font-black text-3xl sm:text-5xl lg:text-6xl tracking-wider uppercase text-glow-purple">
            <span className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              VIBESETTER
            </span>{' '}
            <span className="text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.9)]">
              OS
            </span>
          </h1>

          <p className="mt-3 text-base sm:text-xl font-rajdhani font-semibold tracking-wide text-purple-200/90 max-w-xl mx-auto">
            Your AI Companion. Your Mood. Your Vibe.
          </p>

          <p className="mt-1 text-xs sm:text-sm font-mono text-slate-400 tracking-wider">
            Futuristic Autonomous Rover Control & Neural Emotion Synthesis Engine
          </p>
        </motion.div>

        {/* Interactive Quick Telemetry Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyber-void/80 border border-purple-500/25 text-xs font-mono text-purple-300">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>NEURAL SYNC: 99.4%</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyber-void/80 border border-purple-500/25 text-xs font-mono text-cyan-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>MOOD: {currentMood?.moodTitle || 'Euphoric'}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyber-void/80 border border-purple-500/25 text-xs font-mono text-emerald-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>CHASSIS: NOMINAL</span>
          </div>
        </div>

      </div>
    </section>
  );
}

export default HeroVisualizer;

