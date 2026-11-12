/**
 * VIBESETTER OS - Expressions & Mood Engine Service
 * 
 * Controls the rover's facial OLED screen, emotional states, LED gaze matrix,
 * and mood synchronizer.
 */

import { apiRequest } from './apiClient';

export const AVAILABLE_EXPRESSIONS = [
  { id: 'happy', name: 'Joyful Sparks', icon: 'Smile', color: '#a855f7', aura: 'Energetic' },
  { id: 'curious', name: 'Curious Scan', icon: 'Eye', color: '#06b6d4', aura: 'Inquisitive' },
  { id: 'cyber', name: 'Cyberpunk HUD', icon: 'Terminal', color: '#c084fc', aura: 'Analytical' },
  { id: 'vibe', name: 'Music Sync', icon: 'Headphones', color: '#d946ef', aura: 'Euphoric' },
  { id: 'fierce', name: 'Guardian Mode', icon: 'ShieldAlert', color: '#f43f5e', aura: 'Protective' },
  { id: 'chill', name: 'Zen Orbit', icon: 'Moon', color: '#8b5cf6', aura: 'Calm' },
  { id: 'wink', name: 'Playful Wink', icon: 'Sparkles', color: '#ec4899', aura: 'Playful' },
  { id: 'matrix', name: 'Code Rain', icon: 'Cpu', color: '#10b981', aura: 'Synchronized' }
];

const DEFAULT_MOOD = {
  activeExpression: 'vibe',
  moodTitle: 'Euphoric & Playful',
  subtitle: 'Synchronized with your vibe',
  energy: 88, // 0 - 100
  valence: 92, // 0 - 100 (positivity)
  focus: 76, // 0 - 100
  auraColor: '#a855f7',
  ledPattern: 'wave_pulse'
};

/**
 * Fetch current mood and expression state
 * Python route: GET /api/expressions/current
 */
export async function getCurrentMood() {
  return apiRequest('/expressions/current', { method: 'GET' }, () => {
    return {
      ...DEFAULT_MOOD,
      energy: Math.min(100, Math.max(20, DEFAULT_MOOD.energy + Math.floor(Math.sin(Date.now() / 4000) * 8)))
    };
  });
}

/**
 * Set the rover face expression on the hardware screen
 * Python route: POST /api/expressions/set
 * @param {string} expressionId
 */
export async function setExpression(expressionId) {
  const match = AVAILABLE_EXPRESSIONS.find(e => e.id === expressionId);
  return apiRequest('/expressions/set', {
    method: 'POST',
    body: JSON.stringify({ expressionId })
  }, {
    status: 'success',
    expressionId,
    expressionName: match ? match.name : expressionId,
    timestamp: Date.now()
  });
}

/**
 * Update the emotional valence and energy params
 * Python route: POST /api/expressions/mood
 * @param {object} moodData - { energy, valence, focus }
 */
export async function updateMood(moodData) {
  return apiRequest('/expressions/mood', {
    method: 'POST',
    body: JSON.stringify(moodData)
  }, {
    status: 'success',
    updatedMood: { ...DEFAULT_MOOD, ...moodData }
  });
}

export default {
  AVAILABLE_EXPRESSIONS,
  getCurrentMood,
  setExpression,
  updateMood
};

