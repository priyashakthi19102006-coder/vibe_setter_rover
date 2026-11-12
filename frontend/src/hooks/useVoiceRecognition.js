/**
 * VIBESETTER OS - useVoiceRecognition Hook
 * ========================================
 * Encapsulates browser Web Speech API (SpeechRecognition / webkitSpeechRecognition),
 * live microphone MediaStream audio frequency analysis (Web Audio API),
 * and speech synthesis (TTS) feedback.
 * 
 * Accurately detects and classifies microphone permission errors:
 * - 'not-allowed' / 'PermissionDeniedError'
 * - 'no-speech'
 * - 'audio-capture'
 * - 'not-supported'
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceRecognition({ onFinalTranscript, onSpeechStart, onSpeechEnd } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micPermission, setMicPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [micError, setMicError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0.0 - 1.0 for real-time visualization

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isStoppingIntentionallyRef = useRef(false);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicPermission('unsupported');
      setMicError({
        type: 'UNSUPPORTED',
        message: 'Your browser does not natively support the Web Speech API. You can still type commands directly into the terminal below.'
      });
      return;
    }

    // Check permissions API if available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' })
        .then((permissionStatus) => {
          setMicPermission(permissionStatus.state);
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state);
            if (permissionStatus.state === 'granted') {
              setMicError(null);
            }
          };
        })
        .catch(() => {
          // Permissions query not supported for microphone on some browsers; fallback to prompt
          setMicPermission('prompt');
        });
    }
  }, []);

  // Initialize SpeechRecognition instance
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Capture discrete voice commands
    recognition.interimResults = true; // Stream live transcript as words are spoken
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMicError(null);
      setInterimTranscript('');
      if (onSpeechStart) onSpeechStart();
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final) {
        setInterimTranscript(final);
        if (onFinalTranscript) {
          onFinalTranscript(final.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('[SpeechRecognition] Error event:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicPermission('denied');
        setMicError({
          type: 'PERMISSION_DENIED',
          message: 'Microphone access was denied by your browser. Please allow microphone permissions in your site settings to enable voice control.'
        });
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // User didn't speak in time; silent soft error
        setMicError({
          type: 'NO_SPEECH',
          message: 'No speech was detected. Tap the mic and speak clearly.'
        });
      } else if (event.error === 'network') {
        setMicError({
          type: 'NETWORK',
          message: 'Speech recognition network connection interrupted.'
        });
      } else if (event.error !== 'aborted') {
        setMicError({
          type: event.error.toUpperCase(),
          message: `Speech recognition error: ${event.error}`
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      stopAudioAnalysis();
      if (onSpeechEnd) onSpeechEnd();
    };

    return recognition;
  }, [onFinalTranscript, onSpeechStart, onSpeechEnd]);

  // Audio frequency analyser setup using getUserMedia
  const startAudioAnalysis = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicPermission('granted');

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Compute average normalized amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength / 255;
        setAudioLevel(avg);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermission('denied');
        setMicError({
          type: 'PERMISSION_DENIED',
          message: 'Microphone permission denied. Grant access to use voice commands.'
        });
      } else {
        console.warn('[AudioAnalysis] Audio stream capture warning:', err);
      }
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Start listening
  const startListening = useCallback(async () => {
    setMicError(null);
    isStoppingIntentionallyRef.current = false;

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicPermission('unsupported');
      setMicError({
        type: 'UNSUPPORTED',
        message: 'Speech recognition is not supported in this browser. Use Chrome, Edge, or enter text below.'
      });
      return;
    }

    try {
      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }

      // Start audio analysis for visualizer
      startAudioAnalysis();

      // Start speech recognition
      recognitionRef.current.start();
    } catch (err) {
      // If already started or aborting, recreate instance
      if (err.name === 'InvalidStateError') {
        recognitionRef.current = initRecognition();
        try {
          recognitionRef.current.start();
        } catch (retryErr) {
          console.warn('[Speech] Start retry warning:', retryErr);
        }
      } else {
        console.error('[Speech] Start error:', err);
      }
    }
  }, [initRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    isStoppingIntentionallyRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[Speech] Stop error:', err);
      }
    }
    stopAudioAnalysis();
    setIsListening(false);
  }, []);

  // Text-To-Speech (TTS)
  const speakText = useCallback((text, { rate = 1.05, pitch = 1.0, onEnd } = {}) => {
    if (!('speechSynthesis' in window) || !text) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel(); // Abort previous utterance

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Select robotic or modern voice if available
    const voices = window.speechSynthesis.getVoices();
    const roboticVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Natural') || 
      v.name.includes('Samantha') || 
      v.name.includes('Daniel')
    );
    if (roboticVoice) {
      utterance.voice = roboticVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
      stopAudioAnalysis();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isListening,
    interimTranscript,
    micPermission,
    micError,
    isSpeaking,
    audioLevel,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    clearError: () => setMicError(null)
  };
}

