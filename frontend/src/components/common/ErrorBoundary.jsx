/**
 * VIBESETTER OS - React Error Boundary Component
 * ===============================================
 * Catches JavaScript and rendering errors in any child component tree,
 * logs error diagnostics safely, and presents a cyberpunk recovery screen.
 * 
 * Prevents white/blank screen crashes across the entire OS.
 */

import React from 'react';
import { RotateCcw, AlertTriangle, ShieldCheck, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[VIBESETTER OS Recovery] Component Render Failure:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetToHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const userMessage = this.state.error?.message || 'An unexpected rendering error occurred in this module.';

      return (
        <div className="min-h-screen w-full bg-[#06060c] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none">
          {/* Cyberpunk grid & ambient purple glow */}
          <div className="fixed inset-0 bg-cyber-grid opacity-20 pointer-events-none" />
          <div className="fixed -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-purple-600/20 blur-[140px] pointer-events-none" />

          {/* Recovery Dialog Container */}
          <div className="relative z-10 w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-cyber-void/90 border-2 border-purple-500/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(168,85,247,0.35),inset_0_0_20px_rgba(168,85,247,0.15)] text-center flex flex-col items-center">
            
            {/* Warning Shield Beacon */}
            <div className="relative w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-400/60 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(168,85,247,0.6)]">
              <AlertTriangle className="w-8 h-8 text-fuchsia-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
              </span>
            </div>

            {/* Header Titles */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300 font-mono text-[10px] tracking-widest uppercase mb-2">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              FAILSAFE RECOVERY ACTIVE
            </div>

            <h1 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white tracking-wide text-glow-purple">
              VIBESETTER OS — SYSTEM RECOVERY
            </h1>

            <p className="font-mono text-xs text-slate-400 mt-2 max-w-sm">
              The application encountered a runtime anomaly, but failsafe protection intercepted it to preserve system integrity.
            </p>

            {/* Simple Error Description Card */}
            <div className="w-full my-5 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-left font-mono text-xs">
              <div className="text-[10px] uppercase text-purple-400 tracking-wider font-bold mb-1">
                ERROR DIAGNOSTIC:
              </div>
              <div className="text-purple-200 line-clamp-3">
                {userMessage}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="w-full flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-orbitron font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                RELOAD APPLICATION
              </button>

              <button
                onClick={this.handleResetToHome}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyber-void border border-purple-500/30 hover:border-purple-400 text-purple-300 hover:text-white font-mono text-xs transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                DASHBOARD
              </button>
            </div>

            {/* Footer */}
            <span className="text-[10px] font-mono text-slate-500 mt-4">
              VIBESETTER OS v2.5 // CORE TELEMETRY PRESERVED
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

