/**
 * VIBESETTER OS - CyberButton Component
 * 
 * Futuristic interactive button with neon glow, chamfered hover accents,
 * and Framer Motion haptic scale feedback.
 */

import React from 'react';
import { motion } from 'framer-motion';

export function CyberButton({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size = 'md',
  icon: Icon,
  disabled = false,
  className = '',
  type = 'button'
}) {
  const baseClasses = 'relative inline-flex items-center justify-center font-medium font-mono uppercase tracking-wider transition-all duration-200 select-none cursor-pointer';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2 rounded-xl gap-2',
    lg: 'text-base px-6 py-3 rounded-xl gap-2.5',
  };

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-purple-600 to-indigo-600 text-white
      border border-purple-400/50
      shadow-[0_0_20px_rgba(168,85,247,0.35)]
      hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]
      hover:border-purple-300
    `,
    secondary: `
      bg-cyber-surface/80 text-purple-200
      border border-purple-500/30
      hover:border-purple-400 hover:bg-purple-950/40
      shadow-[0_0_12px_rgba(168,85,247,0.2)]
    `,
    danger: `
      bg-gradient-to-r from-rose-600 to-red-600 text-white
      border border-rose-400/60
      shadow-[0_0_20px_rgba(244,63,94,0.4)]
      hover:shadow-[0_0_30px_rgba(244,63,94,0.7)]
      hover:border-rose-300
    `,
    ghost: `
      text-slate-300 hover:text-purple-300
      hover:bg-purple-950/30
      border border-transparent hover:border-purple-500/20
    `,
    outline: `
      border border-purple-500/40 text-purple-300
      hover:border-purple-400 hover:bg-purple-950/30 hover:text-white
      hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]
    `
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`
        ${baseClasses}
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.primary}
        ${disabled ? 'opacity-50 cursor-not-allowed filter grayscale' : ''}
        ${className}
      `}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
    </motion.button>
  );
}

export default CyberButton;

