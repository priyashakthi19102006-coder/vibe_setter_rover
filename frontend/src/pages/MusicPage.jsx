/**
 * VIBESETTER OS - Music & Lyrics System Page
 * ==========================================
 * High-tech cyberpunk acoustic synchronizer, music library browser,
 * seekable audio player, and real-time LRC timestamped lyrics synchronizer.
 * 
 * FEATURES:
 * 1. Music library with metadata (BPM, genre, duration, lyrics availability)
 * 2. Instant song selection with automatic stream loading
 * 3. Play / Pause / Stop controls
 * 4. Next / Previous track switching with queue wrap-around
 * 5. Volume control with mute toggle and memory
 * 6. Interactive progress bar with seeking and formatted m:ss display
 * 7. Current song information with spinning holographic vinyl and spectrum visualizer
 * 8. Real-time LRC timestamped lyrics:
 *    - Accurate sync with audio playback currentTime
 *    - Active lyric highlighting with neon purple glow
 *    - Smooth automatic scrolling to current line
 *    - Graceful empty message for instrumental tracks
 * 9. Rover Integration:
 *    - Triggers EXCITED OLED expression on play
 *    - Triggers HAPPY on pause / track switch
 *    - Triggers IDLE on stop
 *    - Explicit distinction between browser stream & rover speaker hardware
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square,
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Radio, 
  Sparkles, 
  Music, 
  Disc,
  Activity,
  FileText,
  Clock,
  Wifi,
  WifiOff,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

import GlassCard from '../components/common/GlassCard';
import CyberButton from '../components/common/CyberButton';
import { 
  getMusicLibrary, 
  playMusic, 
  pauseMusic, 
  stopMusic, 
  getMusicStatus, 
  getSongLyrics, 
  getAudioStreamUrl 
} from '../services/musicService';

export function MusicPage({ isConnected = false, onMoodChange }) {
  // Library & Active Song State
  const [library, setLibrary] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [lyrics, setLyrics] = useState([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [hasLyrics, setHasLyrics] = useState(true);

  // Playback Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(34);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [roverMoodBadge, setRoverMoodBadge] = useState('IDLE');

  // DOM Refs for Audio & Auto-scrolling Lyrics
  const audioRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const lyricLineRefs = useRef([]);

  // 1. Initial Library & Status Load
  useEffect(() => {
    let isMounted = true;

    async function initMusicSystem() {
      try {
        const [libRes, statusRes] = await Promise.all([
          getMusicLibrary(),
          getMusicStatus().catch(() => null)
        ]);

        if (!isMounted) return;

        const songs = libRes.songs || [];
        setLibrary(songs);

        if (songs.length > 0) {
          // Select song from status or fallback to first track
          const initial = (statusRes && statusRes.current_song)
            ? songs.find(s => s.id === statusRes.current_song.id) || songs[0]
            : songs[0];

          selectSong(initial, false);
        }
      } catch (err) {
        console.warn('[MusicPage] Initialization warning:', err);
      }
    }

    initMusicSystem();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Song, Stream URL, and Timestamped Lyrics
  const selectSong = async (song, autoPlay = true) => {
    if (!song) return;
    setIsLoadingSong(true);
    setCurrentSong(song);
    setDuration(song.duration_sec || 30);
    setCurrentTime(0);
    setActiveLyricIndex(-1);

    // Fetch LRC Lyrics
    try {
      const lyricsData = await getSongLyrics(song.id);
      const lines = lyricsData.lyrics || [];
      setLyrics(lines);
      setHasLyrics(lines.length > 0);
    } catch (err) {
      console.warn('[MusicPage] Could not load lyrics:', err);
      setLyrics([]);
      setHasLyrics(false);
    }

    // Set Audio Stream Source
    const streamUrl = getAudioStreamUrl(song.id);
    if (audioRef.current) {
      audioRef.current.src = streamUrl;
      audioRef.current.load();

      if (autoPlay) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          handleBackendPlay(song.id);
        }).catch(e => {
          console.warn('[MusicPage] Autoplay blocked by browser policy:', e);
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(false);
      }
    }

    setIsLoadingSong(false);
  };

  // 3. Audio Element Event Listeners (Time Updates & LRC Sync)
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // Find active lyric line based on timestamp
    if (lyrics.length > 0) {
      let matchedIndex = -1;
      for (let i = 0; i < lyrics.length; i++) {
        const line = lyrics[i];
        const nextLine = lyrics[i + 1];
        if (time >= line.time && (!nextLine || time < nextLine.time)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1 && matchedIndex !== activeLyricIndex) {
        setActiveLyricIndex(matchedIndex);

        // Smoothly auto-scroll to the active lyric
        const targetElement = lyricLineRefs.current[matchedIndex];
        if (targetElement && lyricsContainerRef.current) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSongEnded = () => {
    handleNextSong();
  };

  // 4. Backend Synchronization & Rover Mood Trigger
  const handleBackendPlay = async (songId) => {
    setRoverMoodBadge('EXCITED');
    if (onMoodChange) {
      onMoodChange({ mood: 'EXCITED', moodTitle: 'Hyper Adrenaline', auraColor: '#d946ef' });
    }
    try {
      await playMusic(songId);
    } catch (err) {
      console.warn('[MusicPage] Backend play dispatch warning:', err);
    }
  };

  const handleBackendPause = async () => {
    setRoverMoodBadge('HAPPY');
    if (onMoodChange) {
      onMoodChange({ mood: 'HAPPY', moodTitle: 'Joyful Resonance', auraColor: '#a855f7' });
    }
    try {
      await pauseMusic();
    } catch (err) {
      console.warn('[MusicPage] Backend pause dispatch warning:', err);
    }
  };

  const handleBackendStop = async () => {
    setRoverMoodBadge('IDLE');
    if (onMoodChange) {
      onMoodChange({ mood: 'IDLE', moodTitle: 'Ambient Standby', auraColor: '#8b5cf6' });
    }
    try {
      await stopMusic();
    } catch (err) {
      console.warn('[MusicPage] Backend stop dispatch warning:', err);
    }
  };

  // 5. Playback Action Handlers
  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      handleBackendPause();
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        handleBackendPlay(currentSong.id);
      }).catch(err => {
        console.error('[MusicPage] Audio play failed:', err);
      });
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveLyricIndex(-1);
    handleBackendStop();
  };

  const handleNextSong = () => {
    if (library.length === 0 || !currentSong) return;
    const currentIndex = library.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % library.length;
    selectSong(library[nextIndex], isPlaying);
  };

  const handlePrevSong = () => {
    if (!audioRef.current || library.length === 0 || !currentSong) return;
    // If more than 3 seconds in, restart track
    if (currentTime > 3.0) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const currentIndex = library.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + library.length) % library.length;
    selectSong(library[prevIndex], isPlaying);
  };

  // 6. Volume & Seeking Handlers
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVol / 100;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : volume / 100;
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* Hidden HTML5 Audio Element for Real-Time Streaming */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleSongEnded}
        preload="auto"
      />

      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-purple-500/20">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
              MUSIC & LYRICS ENGINE
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-900/60 border border-purple-400/50 text-purple-300">
              LRC SYNC v2.5
            </span>
          </div>
          <p className="text-sm font-mono text-slate-400 mt-1">
            Royalty-free cyberpunk audio streaming, synchronized timestamped lyrics, and rover mood reactivity.
          </p>
        </div>

        {/* Rover Mood & Hardware Sync Status Pill */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-2 bg-purple-950/60 border-purple-500/40 text-purple-300">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
            <span>ROVER MOOD: <strong className="text-white">{roverMoodBadge}</strong></span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-2 ${
            isConnected
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-cyber-void/80 border-slate-700 text-slate-400'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>ROVER OLED LINKED</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                <span>BROWSER AUDIO ONLY</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN 3-PANEL INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* ========================================================
            LEFT COLUMN (7 Cols): Holographic Player & Scrubber
            ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Main Cyber Audio Player Card */}
          <GlassCard glowColor="purple" className="p-6">
            
            {/* Spinning Holographic Vinyl & Track Metadata */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-purple-500/20">
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                {/* Vinyl Glow Ring */}
                <motion.div
                  animate={isPlaying ? { rotate: 360 } : {}}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                  className="w-full h-full rounded-full bg-gradient-to-tr from-purple-950 via-indigo-950 to-fuchsia-950 border-3 border-purple-400/60 shadow-[0_0_30px_rgba(168,85,247,0.5)] flex items-center justify-center relative overflow-hidden"
                >
                  {/* Vinyl Grooves */}
                  <div className="absolute inset-2 rounded-full border border-purple-500/30" />
                  <div className="absolute inset-5 rounded-full border border-purple-500/20" />
                  <div className="absolute inset-8 rounded-full border border-purple-500/30" />
                  
                  {/* Center Hub */}
                  <div className="w-14 h-14 rounded-full bg-cyber-void border-2 border-purple-400 flex items-center justify-center z-10 shadow-[0_0_12px_#a855f7]">
                    <Disc className={`w-7 h-7 text-purple-300 ${isPlaying ? 'animate-pulse' : ''}`} />
                  </div>
                </motion.div>
              </div>

              {/* Track Metadata */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300">
                    {currentSong?.bpm || 128} BPM
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-fuchsia-950 border border-fuchsia-500/40 text-fuchsia-300">
                    {currentSong?.genre || 'Synthwave'}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                    ROYALTY-FREE
                  </span>
                </div>

                <h3 className="font-orbitron font-extrabold text-xl sm:text-2xl text-white mt-2.5 truncate">
                  {currentSong?.title || 'Selecting track...'}
                </h3>
                <p className="text-sm font-rajdhani font-semibold text-purple-200 mt-0.5">
                  {currentSong?.artist || 'VibeSetter Synthesizer'}
                </p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Album: {currentSong?.album || 'Companion Audio Core'}
                </p>

                {/* Rover Reaction Indicator */}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 text-xs font-mono">
                  <Activity className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                  <span className="text-slate-300">
                    {isPlaying 
                      ? 'ROVER MOOD: EXCITED (STAR PUPILS PULSING)' 
                      : 'ROVER MOOD: STANDBY (CALM BLINKING)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Spectrum Visualizer Bars */}
            <div className="my-5">
              <div className="flex items-end justify-between gap-1.5 h-20 p-3 rounded-xl bg-cyber-void/90 border border-purple-500/20">
                {[0.2, 0.5, 0.8, 0.4, 0.9, 0.7, 1.0, 0.6, 0.85, 0.4, 0.95, 0.7, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.75, 0.3, 0.6, 0.85, 0.5, 0.2].map((val, i) => (
                  <motion.div
                    key={i}
                    animate={isPlaying ? {
                      scaleY: [val, 1.0, 0.15, val * 1.25, val],
                    } : { scaleY: 0.08 }}
                    transition={{
                      duration: 0.85,
                      repeat: Infinity,
                      delay: i * 0.03,
                      ease: 'easeInOut'
                    }}
                    className="flex-1 h-full rounded-t-sm bg-gradient-to-t from-purple-700 via-fuchsia-500 to-cyan-300 origin-bottom shadow-[0_0_8px_rgba(168,85,247,0.7)]"
                  />
                ))}
              </div>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="space-y-1.5 mb-6">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 30}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 rounded-full appearance-none bg-slate-900 border border-purple-950 accent-purple-500 cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span className="text-purple-300 font-bold">{formatTime(currentTime)}</span>
                <span className="text-slate-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls (Play, Pause, Stop, Prev, Next, Volume) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-purple-500/20">
              
              {/* Transport Buttons */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrevSong}
                  title="Previous Track"
                  className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:text-white hover:border-purple-400 hover:bg-purple-900/40 cursor-pointer transition-all"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 border-2 border-purple-300 text-white flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.6)] cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5 fill-current" />
                  )}
                </motion.button>

                <button 
                  onClick={handleStop}
                  title="Stop Playback"
                  className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:text-white hover:border-purple-400 hover:bg-purple-900/40 cursor-pointer transition-all"
                >
                  <Square className="w-5 h-5" />
                </button>

                <button 
                  onClick={handleNextSong}
                  title="Next Track"
                  className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:text-white hover:border-purple-400 hover:bg-purple-900/40 cursor-pointer transition-all"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Volume Slider & Mute Toggle */}
              <div className="flex items-center gap-2.5 font-mono text-xs text-slate-400 w-full sm:w-56">
                <button 
                  onClick={handleToggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1.5 rounded-lg border border-purple-500/20 hover:border-purple-400 text-purple-300 hover:text-white cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-purple-400" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <span className="w-9 text-right font-bold text-purple-300">
                  {isMuted ? '0%' : `${volume}%`}
                </span>
              </div>

            </div>

            {/* Hardware Speaker Output Honesty Notice */}
            <div className="mt-5 pt-3 border-t border-purple-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
              <span className="flex items-center gap-1.5 text-purple-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                AUDIO PIPELINE: BROWSER STEREO (HTML5 Web Audio)
              </span>
              <span className="text-slate-500">
                ROVER SPEAKER CONFIRMED: <strong className="text-amber-400">NO (I2S DAC OFFLINE)</strong>
              </span>
            </div>

          </GlassCard>

          {/* Music Library Browser */}
          <GlassCard glowColor="purple" className="p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20">
              <span className="text-xs font-mono uppercase text-slate-300 flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-400" />
                ROYALTY-FREE MUSIC LIBRARY ({library.length} TRACKS)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                CLICK TO PLAY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {library.map((track) => {
                const isSelected = currentSong?.id === track.id;

                return (
                  <div
                    key={track.id}
                    onClick={() => selectSong(track, true)}
                    className={`
                      p-3.5 rounded-2xl border font-mono text-xs flex items-center justify-between transition-all cursor-pointer relative group
                      ${isSelected 
                        ? 'bg-purple-950/90 border-purple-400 text-white shadow-[0_0_18px_rgba(168,85,247,0.4)] scale-[1.01]' 
                        : 'bg-cyber-void/70 border-purple-500/20 text-slate-400 hover:border-purple-400/50 hover:text-white hover:bg-purple-950/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Play/Current Icon */}
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isSelected 
                          ? 'bg-purple-600 text-white shadow-[0_0_10px_#a855f7]' 
                          : 'bg-purple-950/60 text-purple-300 group-hover:bg-purple-900/60'
                      }`}>
                        {isSelected && isPlaying ? (
                          <Activity className="w-4 h-4 animate-pulse" />
                        ) : (
                          <Music className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-orbitron font-bold text-xs truncate text-purple-100">
                          {track.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {track.artist}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {track.has_lyrics && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-fuchsia-950 border border-fuchsia-400/40 text-fuchsia-300">
                          LRC
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px]">
                        {formatTime(track.duration_sec)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

        </div>

        {/* ========================================================
            RIGHT COLUMN (5 Cols): Synchronized LRC Lyrics Display
            ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <GlassCard glowColor="magenta" className="p-6 flex flex-col h-full min-h-[540px]">
            {/* Lyrics Card Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-fuchsia-500/20">
              <span className="text-xs font-mono uppercase text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-fuchsia-400" />
                SYNCHRONIZED LRC LYRICS
              </span>
              <span className="text-[11px] font-mono text-fuchsia-300">
                {hasLyrics ? `${lyrics.length} LINES SYNCED` : 'INSTRUMENTAL'}
              </span>
            </div>

            {/* Lyrics Scrollable Container */}
            <div 
              ref={lyricsContainerRef}
              className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[460px] scrollbar-thin scrollbar-thumb-purple-600/40 scrollbar-track-cyber-void"
            >
              {hasLyrics && lyrics.length > 0 ? (
                lyrics.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  const isPast = idx < activeLyricIndex;

                  return (
                    <motion.div
                      key={idx}
                      ref={(el) => (lyricLineRefs.current[idx] = el)}
                      animate={{
                        scale: isActive ? 1.04 : 1.0,
                        opacity: isActive ? 1.0 : isPast ? 0.45 : 0.65
                      }}
                      transition={{ duration: 0.2 }}
                      className={`
                        p-3.5 rounded-xl border font-mono text-xs sm:text-sm transition-all duration-200
                        ${isActive 
                          ? 'bg-gradient-to-r from-purple-950/90 to-fuchsia-950/90 border-fuchsia-400 text-white shadow-[0_0_22px_rgba(217,70,239,0.5)] font-bold' 
                          : 'bg-cyber-void/50 border-purple-500/10 text-slate-300'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="flex items-center gap-1 text-purple-300">
                          <Clock className="w-3 h-3" />
                          {formatTime(line.time)}
                        </span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/50 text-[9px] text-fuchsia-200 animate-pulse">
                            NOW PLAYING
                          </span>
                        )}
                      </div>
                      <div className={`leading-relaxed ${isActive ? 'text-glow-purple text-white' : ''}`}>
                        {line.text}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                /* Graceful message when lyrics are unavailable */
                <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-6 bg-cyber-void/50 rounded-2xl border border-dashed border-purple-500/30">
                  <div className="p-4 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 mb-4 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <Music className="w-8 h-8" />
                  </div>
                  <h4 className="font-orbitron font-bold text-sm text-white tracking-wide">
                    INSTRUMENTAL TRACK
                  </h4>
                  <p className="text-xs font-mono text-slate-400 mt-2 max-w-xs leading-relaxed">
                    No lyrics detected for this track. Enjoy the synthesized acoustic frequencies and the reactive OLED robot eyes!
                  </p>
                  <div className="mt-4 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-400/30 text-[10px] font-mono text-purple-300">
                    OLED VISUALIZER ACTIVE
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status / Mode Ticker */}
            <div className="mt-4 pt-3 border-t border-fuchsia-500/20 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>SYNC ENGINE: <strong>HTML5 CLOCK</strong></span>
              <span className="text-fuchsia-300">ACTIVE: {formatTime(currentTime)}</span>
            </div>
          </GlassCard>

        </div>

      </div>
    </div>
  );
}

export default MusicPage;
