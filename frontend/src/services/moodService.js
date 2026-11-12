/**
 * VIBESETTER OS - Mood & Emotion Service
 * =====================================
 * Controls rover emotional states, animated OLED robot eyes,
 * and mood synchronization with backend & physical ESP32.
 * 
 * Supported Moods:
 * - HAPPY
 * - EXCITED
 * - SAD
 * - ANGRY
 * - SLEEPY
 * - THINKING
 * - LISTENING
 * - TALKING
 * - IDLE
 */

import { apiRequest } from './apiClient';

export const MOOD_DEFINITIONS = [
  {
    id: 'HAPPY',
    name: 'Joyful Sparks',
    icon: 'Smile',
    color: '#a855f7', // Neon Purple
    valence: 95,
    energy: 85,
    desc: 'Upbeat, cheerful eyes with crescent smile arches.'
  },
  {
    id: 'EXCITED',
    name: 'Hyper Vibe',
    icon: 'Sparkles',
    color: '#d946ef', // Electric Magenta
    valence: 98,
    energy: 100,
    desc: 'Wide circular eyes with pulsing star sparkle pupils.'
  },
  {
    id: 'SAD',
    name: 'Glitch Sorrow',
    icon: 'Frown',
    color: '#3b82f6', // Glitch Blue
    valence: 20,
    energy: 30,
    desc: 'Slanted downward droop with dimmed visor illumination.'
  },
  {
    id: 'ANGRY',
    name: 'Guardian Flame',
    icon: 'Flame',
    color: '#f43f5e', // Crimson Red
    valence: 15,
    energy: 92,
    desc: 'Combat angular wedge slant for defense perimeter.'
  },
  {
    id: 'SLEEPY',
    name: 'Slumber Mode',
    icon: 'Moon',
    color: '#6366f1', // Drowsy Indigo
    valence: 60,
    energy: 15,
    desc: 'Heavy half-closed eyelids with floating Zzz.'
  },
  {
    id: 'THINKING',
    name: 'Neural Processing',
    icon: 'Cpu',
    color: '#06b6d4', // Cyber Cyan
    valence: 70,
    energy: 75,
    desc: 'Scanning pupils oscillating with neural sweep scanlines.'
  },
  {
    id: 'LISTENING',
    name: 'Acoustic Capture',
    icon: 'Mic',
    color: '#ec4899', // Hot Pink
    valence: 85,
    energy: 80,
    desc: 'Alert radar rings radiating above focused eyes.'
  },
  {
    id: 'TALKING',
    name: 'Vocal Stream',
    icon: 'MessageSquare',
    color: '#10b981', // Matrix Emerald
    valence: 90,
    energy: 88,
    desc: 'Expressive eyes with dynamic talking mouth wave.'
  },
  {
    id: 'IDLE',
    name: 'Calm Standby',
    icon: 'Eye',
    color: '#8b5cf6', // Deep Violet
    valence: 75,
    energy: 50,
    desc: 'Relaxed capsule eyes with non-blocking blink & saccades.'
  }
];

const DEFAULT_MOOD_STATE = {
  mood: 'IDLE',
  title: 'Ambient Standby',
  description: 'Relaxed monitoring, occasional blinking and saccades.',
  valence: 75,
  energy: 50,
  focus: 60,
  auraColor: '#8b5cf6',
  eyePattern: 'standard_capsule',
  esp32_synced: false,
  esp32_connected: false,
  last_change_timestamp: Date.now() / 1000
};

/**
 * Fetch current mood and OLED eye telemetry
 * Backend route: GET /api/mood/current
 */
export async function getCurrentMood() {
  return apiRequest('/mood/current', { method: 'GET' }, DEFAULT_MOOD_STATE);
}

/**
 * Command the rover to shift its mood & OLED robot eyes
 * Backend route: POST /api/mood/set
 * @param {string} mood - HAPPY, EXCITED, SAD, ANGRY, SLEEPY, THINKING, LISTENING, TALKING, IDLE
 * @param {number} autoRevertSec - Optional seconds to revert back to IDLE
 */
export async function setMood(mood, autoRevertSec = null) {
  const normalized = mood.toUpperCase();
  const match = MOOD_DEFINITIONS.find(m => m.id === normalized);

  return apiRequest('/mood/set', {
    method: 'POST',
    body: JSON.stringify({
      mood: normalized,
      auto_revert_sec: autoRevertSec
    })
  }, {
    status: 'success',
    mood_state: {
      ...DEFAULT_MOOD_STATE,
      mood: normalized,
      title: match?.name || normalized,
      auraColor: match?.color || '#a855f7'
    }
  });
}

export default {
  MOOD_DEFINITIONS,
  getCurrentMood,
  setMood
};

