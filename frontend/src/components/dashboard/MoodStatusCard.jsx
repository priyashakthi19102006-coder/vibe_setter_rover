/**
 * VIBESETTER OS - Current Mood Card
 * 
 * Displays the rover's affective computing status:
 * - Current Mood state ("Euphoric & Playful")
 * - Emotional Energy & Valence gauges
 * - Synchronized LED Aura hue
 * - Quick expression preset triggers
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Heart, 
  Smile, 
  Flame, 
  Music,
  Sliders
} from 'lucide-react';
import GlassCard from '../common/GlassCard';
import MetricIndicator from '../common/MetricIndicator';
import CyberButton from '../common/CyberButton';

export function MoodStatusCard({
  mood: rawMood,
  onOpenExpressionsTab
}) {
  const mood = rawMood || {
    moodTitle: 'Ambient Standby',
    subtitle: 'Synchronized with your vibe',
    energy: 75,
    valence: 80,
    auraColor: '#a855f7',
    activeExpression: 'IDLE'
  };
  return (
    <GlassCard glowColor="magenta" className="p-5 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-fuchsia-950/60 border border-fuchsia-500/40 text-fuchsia-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base tracking-wide text-white">
                CURRENT MOOD
              </h3>
              <p className="text-[11px] font-mono text-purple-300/80">
                AFFECTIVE COMPUTING & VIBE SYNC
              </p>
            </div>
          </div>

          {/* Glowing Aura Color Dot */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-400/30">
            <span 
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] animate-pulse"
              style={{ backgroundColor: mood.auraColor, color: mood.auraColor }}
            />
            <span className="text-[11px] font-mono text-purple-200 uppercase font-semibold">
              AURA SYNC
            </span>
          </div>
        </div>

        {/* Mood Title Box */}
        <div className="p-3.5 mb-3 rounded-xl bg-gradient-to-r from-purple-950/30 to-fuchsia-950/20 border border-fuchsia-500/30 relative overflow-hidden">
          <div className="text-xs font-mono text-fuchsia-300 uppercase tracking-wider mb-1">
            DOMINANT EMOTION
          </div>
          <div className="font-orbitron text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-200 to-purple-300">
            {mood.moodTitle}
          </div>
          <div className="text-xs font-mono text-slate-300 mt-1">
            "{mood.subtitle}"
          </div>
        </div>

        {/* Emotion Gauges */}
        <div className="grid grid-cols-2 gap-2.5">
          <MetricIndicator
            label="Energy"
            value={`${mood.energy}%`}
            icon={Flame}
            color="magenta"
            progress={mood.energy}
          />

          <MetricIndicator
            label="Valence"
            value={`${mood.valence}%`}
            icon={Heart}
            color="purple"
            progress={mood.valence}
          />
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="pt-4 mt-3 border-t border-purple-500/15">
        <CyberButton
          size="sm"
          variant="secondary"
          icon={Smile}
          onClick={onOpenExpressionsTab}
          className="w-full"
        >
          EXPLORE EXPRESSIONS & MOOD
        </CyberButton>
      </div>
    </GlassCard>
  );
}

export default MoodStatusCard;

