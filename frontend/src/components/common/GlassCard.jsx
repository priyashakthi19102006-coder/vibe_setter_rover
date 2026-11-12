/**
 * VIBESETTER OS - Reusable Glassmorphism Card
 * 
 * Features backdrop-blur, cyber-styled glowing purple borders, 
 * corner HUD accents, and optional interactive hover glow.
 */

import React from 'react';
import { motion } from 'framer-motion';

export function GlassCard({
  children,
  className = '',
  hoverGlow = true,
  glowColor = 'purple', // 'purple' | 'cyan' | 'magenta' | 'emerald'
  hasCorners = true,
  onClick,
  ...props
}) {
  const glowStyles = {
    purple: 'hover:border-purple-400/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] border-purple-500/25',
    cyan: 'hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] border-cyan-500/25',
    magenta: 'hover:border-fuchsia-400/60 hover:shadow-[0_0_30px_rgba(217,70,239,0.3)] border-fuchsia-500/25',
    emerald: 'hover:border-emerald-400/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] border-emerald-500/25',
  };

  return (
    <motion.div
      whileHover={hoverGlow && onClick ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        relative rounded-xl 
        bg-cyber-card/75 backdrop-blur-xl 
        border transition-all duration-300
        ${glowStyles[glowColor] || glowStyles.purple}
        ${hasCorners ? 'cyber-corners' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Subtle top ambient sheen */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent pointer-events-none" />
      
      {children}
    </motion.div>
  );
}

export default GlassCard;

