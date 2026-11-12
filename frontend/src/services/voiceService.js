/**
 * VIBESETTER OS - Voice Command & Speech Processing Service
 * =========================================================
 * Connects frontend speech input to the Python Voice Command Pipeline:
 * POST /api/voice/process
 * GET /api/voice/status
 * POST /api/voice/clear-session
 */

import { apiRequest } from './apiClient';

/**
 * Sends speech transcription or audio payload to the backend voice pipeline
 * @param {object} payload - { transcript?: string, text?: string, audio_base64?: string, session_id?: string }
 * @returns {Promise<object>} - { transcript, intent, action, response, needs_clarification, ... }
 */
export async function processVoiceCommand(payload) {
  const sessionId = payload.session_id || 'vibesetter-web-client';

  return apiRequest('/voice/process', {
    method: 'POST',
    body: JSON.stringify({
      transcript: payload.transcript || payload.text || '',
      session_id: sessionId,
      audio_base64: payload.audio_base64 || null
    })
  }, null); // null fallback: strictly rely on backend response or throw for real status
}

/**
 * Fetch Voice subsystem capabilities and pipeline status
 */
export async function getVoiceStatus() {
  return apiRequest('/voice/status', { method: 'GET' }, {
    status: 'ONLINE',
    pipeline: ['Microphone', 'Speech-to-Text', 'Intent Detection', 'Safety Router', 'Response'],
    supported_intents: [
      'MOVE_FORWARD', 'MOVE_BACKWARD', 'MOVE_LEFT', 'MOVE_RIGHT',
      'TURN_LEFT', 'TURN_RIGHT', 'EMERGENCY_STOP', 'PLAY_MUSIC',
      'STOP_MUSIC', 'CHANGE_EXPRESSION', 'GENERAL_CONVERSATION'
    ]
  });
}

/**
 * Clear pending clarification state for the current session
 * @param {string} sessionId
 */
export async function clearVoiceSession(sessionId = 'vibesetter-web-client') {
  return apiRequest('/voice/clear-session', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId })
  }, { status: 'cleared', session_id: sessionId });
}

