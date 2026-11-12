/**
 * VIBESETTER OS - Main Application Root
 * =====================================
 * Futuristic AI Companion Rover Control Dashboard.
 * Integrates real-time telemetry, hardware drive station, neural voice AI,
 * OLED matrix expressions, acoustic sync, and system settings.
 * 
 * ROUTING ARCHITECTURE (React Router v7 / BrowserRouter):
 * - /             -> Dashboard
 * - /dashboard    -> Dashboard
 * - /control      -> Rover Control
 * - /voice        -> Voice AI
 * - /expressions  -> Expressions
 * - /music        -> Music Player
 * - /settings     -> Settings
 * - *             -> 404 Route Fallback
 * 
 * RESILIENCY & FAILSAFE:
 * - Error Boundary protection across application and individual route views.
 * - Non-crashing offline recovery mode with top recovery notification banner.
 * - Safe WebSocket stream with automatic reconnection.
 */

import React, { useState, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, WifiOff } from 'lucide-react';

// Layout Components
import Navbar from './components/layout/Navbar';
import TabNavigation from './components/layout/TabNavigation';
import ErrorBoundary from './components/common/ErrorBoundary';

// Page Views
import DashboardPage from './pages/DashboardPage';
import ControlPage from './pages/ControlPage';
import VoiceAiPage from './pages/VoiceAiPage';
import ExpressionsPage from './pages/ExpressionsPage';
import MusicPage from './pages/MusicPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// Custom Hooks
import { useRoverTelemetry } from './hooks/useRoverTelemetry';
import { useRoverControl } from './hooks/useRoverControl';

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [localMoodOverride, setLocalMoodOverride] = useState(null);

  // Telemetry & Hardware State Hook (Resilient against backend outage)
  const {
    telemetry,
    systemInfo,
    mood: polledMood,
    roverLiveStatus,
    isConnected,
    connectionStatus,
    isBackendOffline,
    refresh: refreshTelemetry
  } = useRoverTelemetry(2000);

  // Motor Control & Emergency Stop Hook
  const control = useRoverControl(isConnected, refreshTelemetry);

  // Derive active tab from current URL pathname
  const activeTab = useMemo(() => {
    const path = location.pathname.replace(/^\//, '').toLowerCase();
    if (!path || path === 'dashboard') return 'dashboard';
    if (path === 'control') return 'control';
    if (path === 'voice') return 'voice';
    if (path === 'expressions') return 'expressions';
    if (path === 'music') return 'music';
    if (path === 'settings') return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    navigate(tabId === 'dashboard' ? '/dashboard' : `/${tabId}`);
  };

  // Combine polled mood with local overrides for immediate reactive UI
  const currentMood = localMoodOverride || polledMood;

  return (
    <div className="min-h-screen bg-cyber-bg text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-purple-600 selection:text-white">
      
      {/* Ambient Sci-Fi Mesh Grids & Glow */}
      <div className="fixed inset-0 bg-cyber-grid opacity-20 pointer-events-none z-0" />
      
      {/* Top Ambient Nebula Glow */}
      <div 
        className="fixed -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full blur-[160px] opacity-25 pointer-events-none z-0 transition-colors duration-1000"
        style={{ background: currentMood?.auraColor || '#a855f7' }}
      />

      {/* 1. TOP NAVIGATION BAR */}
      <Navbar
        isConnected={isConnected}
        pingMs={systemInfo?.pingMs || 0}
        battery={telemetry?.battery}
        onOpenSettings={() => navigate('/settings')}
        activeTab={activeTab}
      />

      {/* Offline Recovery Mode Banner (Displayed when Backend is Offline) */}
      {isBackendOffline && (
        <div className="w-full bg-gradient-to-r from-purple-950/95 via-fuchsia-950/90 to-purple-950/95 border-b border-purple-500/40 px-4 py-2 text-center text-xs font-mono text-purple-200 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] z-40 relative">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
          <span className="font-semibold text-white">
            Backend Offline — UI Running in Connection Recovery Mode
          </span>
          <span className="text-[10px] text-slate-400 hidden md:inline">
            // Telemetry simulated locally; physical rover hardware controls locked
          </span>
        </div>
      )}

      {/* 2. NAVIGATION TABS */}
      <TabNavigation
        activeTab={activeTab}
        onChangeTab={handleTabChange}
      />

      {/* 3. DYNAMIC ROUTED PAGE CONTENT WITH FRAMER MOTION TRANSITIONS */}
      <main className="flex-1 relative z-10">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="w-full"
            >
              <Routes location={location}>
                {/* Root Route -> Redirects to /dashboard */}
                <Route
                  path="/"
                  element={
                    <DashboardPage
                      telemetry={telemetry}
                      systemInfo={systemInfo}
                      mood={currentMood}
                      isConnected={isConnected}
                      connectionStatus={connectionStatus}
                      onEmergencyStop={control.triggerEmergencyStop}
                      onToggleLights={control.toggleHeadlights}
                      headlightsActive={control.headlights}
                      onNavigateTab={handleTabChange}
                      onRefreshTelemetry={refreshTelemetry}
                    />
                  }
                />

                {/* Dashboard Suite */}
                <Route
                  path="/dashboard"
                  element={
                    <DashboardPage
                      telemetry={telemetry}
                      systemInfo={systemInfo}
                      mood={currentMood}
                      isConnected={isConnected}
                      connectionStatus={connectionStatus}
                      onEmergencyStop={control.triggerEmergencyStop}
                      onToggleLights={control.toggleHeadlights}
                      headlightsActive={control.headlights}
                      onNavigateTab={handleTabChange}
                      onRefreshTelemetry={refreshTelemetry}
                    />
                  }
                />

                {/* Rover Movement & Rotation Suite */}
                <Route
                  path="/control"
                  element={
                    <ControlPage
                      control={control}
                      telemetry={telemetry}
                      isConnected={isConnected}
                      roverLiveStatus={roverLiveStatus}
                      systemInfo={systemInfo}
                      onRefresh={refreshTelemetry}
                    />
                  }
                />

                {/* Voice AI & Local Ollama 3B Brain */}
                <Route
                  path="/voice"
                  element={<VoiceAiPage />}
                />

                {/* OLED Expressions & Affective Mood Engine */}
                <Route
                  path="/expressions"
                  element={
                    <ExpressionsPage
                      mood={currentMood}
                      onMoodChange={setLocalMoodOverride}
                      isConnected={isConnected}
                    />
                  }
                />

                {/* Music & Timestamped LRC Lyrics Player */}
                <Route
                  path="/music"
                  element={
                    <MusicPage
                      isConnected={isConnected}
                      onMoodChange={setLocalMoodOverride}
                    />
                  }
                />

                {/* System Diagnostics & Hardware Config */}
                <Route
                  path="/settings"
                  element={
                    <SettingsPage
                      systemInfo={systemInfo}
                    />
                  }
                />

                {/* 404 Catch-All Fallback Page */}
                <Route
                  path="*"
                  element={<NotFoundPage />}
                />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* 4. FUTURISTIC BOTTOM TELEMETRY TICKER */}
      <footer className="w-full border-t border-purple-500/15 bg-cyber-void/90 backdrop-blur-md py-3 px-4 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-purple-300 font-semibold tracking-wider">
              VIBESETTER OS v2.5
            </span>
            <span>//</span>
            <span>
              {isConnected ? 'HARDWARE TELEMETRY LINKED' : 'FAILSAFE SIMULATION ACTIVE'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>DRIVE: <span className="text-purple-300 uppercase">{control.activeMode}</span></span>
            <span>LIGHTS: <span className={control.headlights ? 'text-emerald-400' : 'text-slate-500'}>{control.headlights ? 'ON' : 'OFF'}</span></span>
            <span className="text-purple-400">MOOD: {currentMood?.moodTitle || 'AMBIENT STANDBY'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
