/**
 * VIBESETTER OS - Navigation Tabs
 * 
 * Provides responsive switching between the 6 core operational suites:
 * 1. Dashboard
 * 2. Control
 * 3. Voice AI
 * 4. Expressions
 * 5. Music
 * 6. Settings
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Gamepad2, 
  Mic, 
  Smile, 
  Music, 
  Settings,
  Sparkles
} from 'lucide-react';

export const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'control', label: 'Control', icon: Gamepad2 },
  { id: 'voice', label: 'Voice AI', icon: Mic, badge: 'LIVE' },
  { id: 'expressions', label: 'Expressions', icon: Smile },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function TabNavigation({ activeTab, onChangeTab }) {
  return (
    <nav className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-cyber-void/70 border border-purple-500/25 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-1 sm:gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-semibold tracking-wider transition-all duration-200 select-none cursor-pointer whitespace-nowrap
                  ${isActive 
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-purple-300 hover:bg-purple-950/20'
                  }
                `}
              >
                {/* Active Glowing Tab Background via Framer Motion */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-700/80 via-purple-600/70 to-indigo-700/80 border border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.45)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <span className="relative z-10 flex items-center gap-2">
                  <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110 text-purple-200' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 uppercase tracking-tighter">
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default TabNavigation;

