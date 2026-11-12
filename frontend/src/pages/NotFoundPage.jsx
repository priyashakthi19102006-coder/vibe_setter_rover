/**
 * VIBESETTER OS - 404 Route Fallback Page
 * =======================================
 * Rendered when a user navigates to an unrecognized route.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Home, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CyberButton from '../components/common/CyberButton';
import GlassCard from '../components/common/GlassCard';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <GlassCard glowColor="purple" className="p-8 sm:p-12 flex flex-col items-center w-full">
        {/* Radar Icon */}
        <div className="relative w-20 h-20 rounded-3xl bg-purple-950/80 border-2 border-purple-400/50 flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(168,85,247,0.5)]">
          <Compass className="w-10 h-10 text-purple-300 animate-spin-slow" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
        </div>

        <span className="text-xs font-mono uppercase px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 tracking-widest mb-3">
          404 // ROUTE UNMAPPED
        </span>

        <h2 className="font-orbitron font-extrabold text-2xl sm:text-4xl text-white tracking-wide text-glow-purple">
          LOST IN THE NEURAL VOID
        </h2>

        <p className="font-mono text-xs sm:text-sm text-slate-400 mt-3 max-w-md leading-relaxed">
          The requested coordinate does not map to any recognized operational suite on the VIBESETTER OS telemetry bus.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <CyberButton
            variant="primary"
            size="md"
            icon={Home}
            onClick={() => navigate('/dashboard')}
          >
            RETURN TO DASHBOARD
          </CyberButton>
        </div>
      </GlassCard>
    </div>
  );
}

export default NotFoundPage;

