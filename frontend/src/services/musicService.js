/**
 * VIBESETTER OS - Music & Lyrics Service
 * =====================================
 * Client library for controlling music playback, fetching the royalty-free
 * music library, synchronizing timestamped LRC lyrics, and streaming audio.
 * 
 * Endpoints:
 * - GET  /api/music/library
 * - POST /api/music/play
 * - POST /api/music/pause
 * - POST /api/music/stop
 * - GET  /api/music/status
 * - GET  /api/music/lyrics/{song_id}
 * - GET  /api/music/stream/{song_id}
 */

import { apiRequest } from './apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const SERVER_HOST = API_BASE.replace(/\/api\/?$/, '');

// Fallback library if backend is offline
const FALLBACK_LIBRARY = [
  {
    id: 'track-01',
    title: 'Neon Odyssey (VibeSetter Mix)',
    artist: 'Cybernetic Echoes',
    album: 'Cyberpunk Companion Vol. 1',
    duration_sec: 34.0,
    bpm: 128,
    genre: 'Synthwave',
    mood_tag: 'Euphoric',
    audio_url: '/api/music/stream/track-01',
    has_lyrics: true,
    lyrics_count: 8
  },
  {
    id: 'track-02',
    title: 'Midnight Velocity',
    artist: 'Hyperion Drive',
    album: 'Velocity Protocol',
    duration_sec: 28.0,
    bpm: 134,
    genre: 'Darksynth',
    mood_tag: 'Adrenaline',
    audio_url: '/api/music/stream/track-02',
    has_lyrics: true,
    lyrics_count: 7
  },
  {
    id: 'track-03',
    title: 'Bioluminescent Dreams',
    artist: 'Astral Rover',
    album: 'Starlight Memory',
    duration_sec: 32.0,
    bpm: 92,
    genre: 'Ambient Chill',
    mood_tag: 'Calm',
    audio_url: '/api/music/stream/track-03',
    has_lyrics: true,
    lyrics_count: 7
  },
  {
    id: 'track-04',
    title: 'Sub-Zero Glitch (Instrumental)',
    artist: 'Glitch Runner',
    album: 'Silicon Anomalies',
    duration_sec: 24.0,
    bpm: 140,
    genre: 'Chiptune / Cyber',
    mood_tag: 'Cyber',
    audio_url: '/api/music/stream/track-04',
    has_lyrics: false,
    lyrics_count: 0
  }
];

const FALLBACK_LYRICS = {
  'track-01': [
    { time: 0.0, text: '♪ [Synth Arpeggiator Initialization] ♪' },
    { time: 4.0, text: 'Neon grids pulsing in the midnight rain' },
    { time: 8.5, text: 'Neural signals routing through the data lane' },
    { time: 13.0, text: 'VibeSetter Rover scans the horizon clear' },
    { time: 17.5, text: 'Companion core whispers into the atmosphere' },
    { time: 22.0, text: 'Bassline drops, quantum frequencies align' },
    { time: 26.5, text: 'Synchronized rhythm across space and time' },
    { time: 30.5, text: '♪ [Synthesizer Outro Fade] ♪' }
  ],
  'track-02': [
    { time: 0.0, text: '♪ [High-Speed Motor Whir & Kick] ♪' },
    { time: 3.5, text: 'Overclock the engines, full torque on all four wheels' },
    { time: 7.5, text: 'Tires grip the asphalt, cutting through magnetic fields' },
    { time: 12.0, text: 'Sensor matrix locks onto the navigation route' },
    { time: 16.5, text: 'Push beyond the limit, leaving all the doubts' },
    { time: 21.0, text: 'Velocity is climbing, cyberpunk horizon glows' },
    { time: 25.0, text: '♪ [Sub-bass pulse and engine sweep] ♪' }
  ],
  'track-03': [
    { time: 0.0, text: '♪ [Bioluminescent Chime Waves] ♪' },
    { time: 4.0, text: 'Floating under neon constellations in the dark' },
    { time: 9.0, text: 'Every battery cell recharges from an astral spark' },
    { time: 14.5, text: 'Gentle servo hums beneath the calm electric skies' },
    { time: 20.0, text: 'Peaceful reflections inside glowing robot eyes' },
    { time: 25.5, text: 'Resting on the charging dock until the morning sun' },
    { time: 29.5, text: '♪ [Soft Harmonic Resonance] ♪' }
  ],
  'track-04': []
};

/**
 * Get full music library
 * Backend route: GET /api/music/library
 */
export async function getMusicLibrary() {
  return apiRequest('/music/library', { method: 'GET' }, {
    status: 'success',
    total: FALLBACK_LIBRARY.length,
    songs: FALLBACK_LIBRARY
  });
}

/**
 * Start or resume playback
 * Backend route: POST /api/music/play
 * @param {string} [songId] - Optional song ID to start
 */
export async function playMusic(songId = null) {
  return apiRequest('/music/play', {
    method: 'POST',
    body: JSON.stringify({ song_id: songId })
  }, {
    status: 'success',
    playback: {
      is_playing: true,
      current_song_id: songId || 'track-01',
      rover_mood_triggered: 'EXCITED'
    }
  });
}

/**
 * Pause playback
 * Backend route: POST /api/music/pause
 */
export async function pauseMusic() {
  return apiRequest('/music/pause', {
    method: 'POST'
  }, {
    status: 'success',
    playback: {
      is_playing: false,
      rover_mood_triggered: 'HAPPY'
    }
  });
}

/**
 * Stop playback and reset to beginning
 * Backend route: POST /api/music/stop
 */
export async function stopMusic() {
  return apiRequest('/music/stop', {
    method: 'POST'
  }, {
    status: 'success',
    playback: {
      is_playing: false,
      progress_sec: 0,
      rover_mood_triggered: 'IDLE'
    }
  });
}

/**
 * Fetch real-time music playback and rover sync status
 * Backend route: GET /api/music/status
 */
export async function getMusicStatus() {
  return apiRequest('/music/status', { method: 'GET' }, {
    status: 'success',
    is_playing: false,
    current_song: FALLBACK_LIBRARY[0],
    progress_sec: 0,
    duration_sec: 34.0,
    volume: 75,
    hardware_speaker_synced: false,
    rover_mood_triggered: 'IDLE'
  });
}

/**
 * Fetch LRC timestamped lyrics for a song
 * Backend route: GET /api/music/lyrics/{song_id}
 * @param {string} songId
 */
export async function getSongLyrics(songId) {
  return apiRequest(`/music/lyrics/${songId}`, { method: 'GET' }, {
    status: 'success',
    song_id: songId,
    title: 'Cyber Track',
    has_lyrics: (FALLBACK_LYRICS[songId] || []).length > 0,
    lyrics: FALLBACK_LYRICS[songId] || []
  });
}

/**
 * Converts audio endpoint path to a fully qualified browser playable URL
 * @param {string} songId
 */
export function getAudioStreamUrl(songId) {
  if (!songId) return null;
  return `${SERVER_HOST}/api/music/stream/${songId}`;
}

// ----------------- BACKWARD COMPATIBILITY EXPORTS -----------------

export async function getAudioState() {
  const stat = await getMusicStatus();
  return {
    isPlaying: stat.is_playing,
    volume: stat.volume,
    currentTrack: stat.current_song ? {
      ...stat.current_song,
      progressSec: stat.progress_sec,
      durationSec: stat.duration_sec
    } : null
  };
}

export async function sendMediaCommand(command, payload = {}) {
  if (command === 'play') return playMusic();
  if (command === 'pause') return pauseMusic();
  if (command === 'stop') return stopMusic();
  if (command === 'toggle_play') {
    const s = await getMusicStatus();
    return s.is_playing ? pauseMusic() : playMusic();
  }
  return apiRequest('/music/control', {
    method: 'POST',
    body: JSON.stringify({ command, payload })
  }, { status: 'success', command });
}

export async function setReactiveLEDs(enabled, mode = 'spectrum') {
  return apiRequest('/music/reactive-leds', {
    method: 'POST',
    body: JSON.stringify({ enabled, mode })
  }, { status: 'success', enabled, mode });
}

export async function getPlaylist() {
  const lib = await getMusicLibrary();
  return (lib.songs || FALLBACK_LIBRARY).map(s => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    duration: `${Math.floor(s.duration_sec / 60)}:${Math.floor(s.duration_sec % 60).toString().padStart(2, '0')}`,
    mood: s.mood_tag || 'Cyber',
    bpm: s.bpm
  }));
}

export default {
  getMusicLibrary,
  playMusic,
  pauseMusic,
  stopMusic,
  getMusicStatus,
  getSongLyrics,
  getAudioStreamUrl,
  getAudioState,
  sendMediaCommand,
  setReactiveLEDs,
  getPlaylist
};
