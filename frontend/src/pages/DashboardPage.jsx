/**
 * VIBESETTER OS - Main Dashboard Page
 * 
 * Houses the Hero Section, Rover Hologram Visualizer,
 * and the 4 Core Dashboard Telemetry Cards.
 */

import React from 'react';
import { motion } from 'framer-motion';
import HeroVisualizer from '../components/dashboard/HeroVisualizer';
import RoverStatusCard from '../components/dashboard/RoverStatusCard';
import AiCompanionCard from '../components/dashboard/AiCompanionCard';
import MoodStatusCard from '../components/dashboard/MoodStatusCard';
import ConnectionCard from '../components/dashboard/ConnectionCard';

export function DashboardPage({
  telemetry,
  systemInfo,
  mood,
  isConnected,
  connectionStatus,
  onEmergencyStop,
  onToggleLights,
  headlightsActive,
  onNavigateTab,
  onRefreshTelemetry
}) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* Hero Section */}
      <HeroVisualizer 
        currentMood={mood} 
      />

      {/* 4 Core Dashboard Cards Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6"
      >
        {/* 1. Rover Hardware Status */}
        <RoverStatusCard
          telemetry={telemetry}
          onEmergencyStop={onEmergencyStop}
          onToggleLights={onToggleLights}
          headlightsActive={headlightsActive}
        />

        {/* 2. AI Companion Status */}
        <AiCompanionCard
          onOpenVoiceTab={() => onNavigateTab('voice')}
        />

        {/* 3. Current Mood & Affective Engine */}
        <MoodStatusCard
          mood={mood}
          onOpenExpressionsTab={() => onNavigateTab('expressions')}
        />

        {/* 4. Connection & Network Bridge */}
        <ConnectionCard
          systemInfo={systemInfo}
          isConnected={isConnected}
          connectionStatus={connectionStatus}
          onRefresh={onRefreshTelemetry}
        />
      </motion.div>

    </div>
  );
}

export default DashboardPage;

