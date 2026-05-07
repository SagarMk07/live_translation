import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'ws://localhost:8000/ws';
const API_URL = 'http://localhost:8000';

// ── Audio queue for sequential TTS playback ───────────────────────────────
function createAudioQueue() {
  const queue = [];
  let isPlaying = false;

  async function playNext() {
    if (isPlaying || queue.length === 0) return;
    isPlaying = true;
    const blob = queue.shift();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const done = () => { URL.revokeObjectURL(url); isPlaying = false; playNext(); };
    audio.onended = done;
    audio.onerror = done;
    try { await audio.play(); } catch { done(); }
  }

  return {
    enqueue(blob) { queue.push(blob); playNext(); },
    clear() { queue.length = 0; isPlaying = false; },
  };
}

// ── Downsample Float32 from nativeRate → 16000 Hz ────────────────────────
function downsampleBuffer(buffer, fromRate, toRate) {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.round(i * ratio)];
  }
  return result;
}

export function useAudioStream() {
  const [isConnected, setIsConnected]         = useState(false);
  const [isRecording, setIsRecording]         = useState(false);
  const [speechEnabled, setSpeechEnabled]     = useState(true);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [subtitles, setSubtitles]             = useState([]);   // unified entries
  const [detectedLang, setDetectedLang]       = useState(null); // {code, confidence}
  const [micError, setMicError]               = useState(null);
  const [volumeLevel, setVolumeLevel]         = useState(0);    // 0–1 for waveform

  // Pending subtitle — accumulates final + its translation
  const pendingSubtitleRef = useRef(null);

  const wsRef            = useRef(null);
  const audioCtxRef      = useRef(null);
  const workletRef       = useRef(null);
  const analyserRef      = useRef(null);
  const micStreamRef     = useRef(null);
  const isRecordingRef   = useRef(false);
  const speechEnabledRef = useRef(true);
  const configRef        = useRef({ targetLang: 'es', sourceLang: 'auto', voiceId: null, gender: 'male', speed: 1.0 });
  const audioQueueRef    = useRef(createAudioQueue());
  const reconnectRef     = useRef(null);
  const isConnectingRef  = useRef(false);
  const isMountedRef     = useRef(true);
  const volumeRafRef     = useRef(null);
  const subtitleIdRef    = useRef(0);

  useEffect(() => { speechEnabledRef.current = speechEnabled; }, [speechEnabled]);

  // ── WebSocket connection ──────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    const connectWs = () => {
      if (isConnectingRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

      isConnectingRef.current = true;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setIsConnected(true);
        clearTimeout(reconnectRef.current);
        const cfg = configRef.current;
        ws.send(JSON.stringify({
          type: 'config',
          target_lang: cfg.targetLang,
          source_lang: cfg.sourceLang,
          voice_id: cfg.voiceId,
          gender: cfg.gender,
          speed: cfg.speed,
        }));
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          if (speechEnabledRef.current) audioQueueRef.current.enqueue(event.data);
          return;
        }
        try {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        setIsConnected(false);
        if (isMountedRef.current) {
          reconnectRef.current = setTimeout(connectWs, 3000);
        }
      };

      ws.onerror = () => { isConnectingRef.current = false; };
    };

    connectWs();

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      audioQueueRef.current.clear();
    };
  }, []);

  // ── Handle incoming server messages ──────────────────────────────────────
  const handleServerMessage = useCallback((data) => {
    switch (data.type) {
      case 'partial':
        setPartialTranscript(data.text);
        if (data.detected_lang) {
          setDetectedLang({ code: data.detected_lang, confidence: data.confidence ?? 1 });
        }
        break;

      case 'final': {
        setPartialTranscript('');
        if (data.detected_lang) {
          setDetectedLang({ code: data.detected_lang, confidence: data.confidence ?? 1 });
        }
        // Create pending subtitle entry waiting for its translation
        const id = ++subtitleIdRef.current;
        pendingSubtitleRef.current = { id, detectedLang: data.detected_lang };
        setSubtitles(prev => [...prev, {
          id,
          timestamp: new Date(),
          original: data.text,
          translated: null,    // will be filled in on 'translation'
          sourceLang: data.detected_lang ?? 'en',
          confidence: data.confidence ?? 1,
          targetLang: configRef.current.targetLang,
        }]);
        break;
      }

      case 'translation': {
        const pending = pendingSubtitleRef.current;
        if (pending) {
          setSubtitles(prev => prev.map(s =>
            s.id === pending.id ? { ...s, translated: data.text } : s
          ));
          pendingSubtitleRef.current = null;
        }
        break;
      }

      case 'text_translation_result':
        // Handled by translateText promise via pendingTextRequests map
        pendingTextRequestsRef.current.get(data.id)?.(data);
        pendingTextRequestsRef.current.delete(data.id);
        break;

      case 'error':
        console.warn('[WS]', data.message);
        break;

      default:
        break;
    }
  }, []);

  const pendingTextRequestsRef = useRef(new Map());

  // ── Send config to backend ────────────────────────────────────────────────
  const sendConfig = useCallback((updates) => {
    Object.assign(configRef.current, updates);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const cfg = configRef.current;
      wsRef.current.send(JSON.stringify({
        type: 'config',
        target_lang: cfg.targetLang,
        source_lang: cfg.sourceLang,
        voice_id: cfg.voiceId,
        gender: cfg.gender,
        speed: cfg.speed,
      }));
    }
  }, []);

  // ── Typed text translation via WebSocket ──────────────────────────────────
  const translateText = useCallback((text) => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (ws?.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const id = `txt-${Date.now()}`;
      pendingTextRequestsRef.current.set(id, resolve);
      ws.send(JSON.stringify({ type: 'text_translate', text, id }));
      // Timeout after 15s
      setTimeout(() => {
        if (pendingTextRequestsRef.current.has(id)) {
          pendingTextRequestsRef.current.delete(id);
          reject(new Error('Translation timed out'));
        }
      }, 15000);
    });
  }, []);

  // ── Volume tracking for waveform ──────────────────────────────────────────
  const startVolumeTracking = useCallback(() => {
    const track = () => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolumeLevel(Math.min(1, avg / 80));
      }
      volumeRafRef.current = requestAnimationFrame(track);
    };
    track();
  }, []);

  const stopVolumeTracking = useCallback(() => {
    if (volumeRafRef.current) {
      cancelAnimationFrame(volumeRafRef.current);
      volumeRafRef.current = null;
    }
    setVolumeLevel(0);
  }, []);

  // ── Get raw analyser data (for WaveformVisualizer canvas) ────────────────
  const getAnalyserData = useCallback(() => {
    if (!analyserRef.current) return null;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    return data;
  }, []);

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    if (isRecordingRef.current) return;

    try {
      // Step 1: Request permission first
      let permStream;
      try {
        permStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[MIC] Permission granted ✅');
      } catch (permErr) {
        throw new Error(`Microphone permission denied: ${permErr.message}`);
      }

      // Step 2: Enumerate real devices after permission granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const SKIP = /virtual|loopback|cable|voicemeeter|stereo mix|what u hear|communications/i;
      const physicalMic = audioInputs.find(
        d => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications' && !SKIP.test(d.label)
      );
      console.log('[MIC] Selected:', physicalMic?.label ?? 'OS default');
      permStream.getTracks().forEach(t => t.stop());

      // Step 3: Get real mic stream
      const constraints = physicalMic
        ? { deviceId: { exact: physicalMic.deviceId }, echoCancellation: true, noiseSuppression: true }
        : { echoCancellation: true, noiseSuppression: true };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      micStreamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      console.log('[MIC] Track:', track?.label, '| state:', track?.readyState);
      if (!track?.enabled || track?.readyState !== 'live') {
        throw new Error(`Mic track not live — enabled:${track?.enabled} readyState:${track?.readyState}`);
      }

      // Step 4: AudioContext at native rate
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor();
      audioCtxRef.current = audioContext;
      await audioContext.resume();
      const nativeRate = audioContext.sampleRate;
      console.log('[MIC] AudioContext:', audioContext.state, '| rate:', nativeRate);

      // Step 5: Build AudioWorklet pipeline
      const source = audioContext.createMediaStreamSource(stream);
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      workletRef.current = workletNode;

      // Step 6: AnalyserNode for waveform
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;
      source.connect(analyser);
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      // Step 7: Receive PCM → downsample → send over WebSocket
      let silentCount = 0;
      let silenceAlerted = false;
      workletNode.port.onmessage = (event) => {
        const float32 = new Float32Array(event.data);
        let peak = 0;
        for (let i = 0; i < float32.length; i++) {
          const v = Math.abs(float32[i]);
          if (v > peak) peak = v;
        }

        if (peak < 0.0001) {
          silentCount++;
          if (silentCount >= 15 && !silenceAlerted) {
            silenceAlerted = true;
            setMicError('⚠️ Mic silence detected. Check Windows Settings → Privacy → Microphone → allow browser. Also check Input volume in Sound Settings.');
          }
        } else {
          silentCount = 0;
          if (silenceAlerted) { silenceAlerted = false; setMicError(null); }
        }

        const downsampled = downsampleBuffer(float32, nativeRate, 16000);
        const pcm = new Int16Array(downsampled.length);
        for (let i = 0; i < downsampled.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, downsampled[i] * 32767));
        }

        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) ws.send(pcm.buffer);
      };

      isRecordingRef.current = true;
      setIsRecording(true);
      setMicError(null);
      startVolumeTracking();
      console.log('[MIC] Pipeline started ✅ (native', nativeRate, 'Hz → 16000 Hz)');

    } catch (err) {
      console.error('[MIC] startRecording failed:', err);
      setMicError(err.message);
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
      try { workletRef.current?.disconnect(); } catch {}
      workletRef.current = null;
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    stopVolumeTracking();
    analyserRef.current = null;
    try { workletRef.current?.disconnect(); } catch {}
    workletRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    setIsRecording(false);
    setPartialTranscript('');
    console.log('[MIC] Stopped');
  };

  const clearSession = () => {
    setSubtitles([]);
    setPartialTranscript('');
    setDetectedLang(null);
    audioQueueRef.current.clear();
    pendingSubtitleRef.current = null;
  };

  // ── Test tone (debugging) ─────────────────────────────────────────────────
  const sendTestTone = () => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    const SR = 16000, FREQ = 440, AMP = 16000, CHUNK = 1365;
    const TOTAL = Math.ceil((SR * 3) / CHUNK);
    let idx = 0;
    const timer = setInterval(() => {
      if (idx >= TOTAL) { clearInterval(timer); return; }
      const pcm = new Int16Array(CHUNK);
      for (let i = 0; i < CHUNK; i++) {
        pcm[i] = Math.round(Math.sin(2 * Math.PI * FREQ * (idx * CHUNK + i) / SR) * AMP);
      }
      ws.send(pcm.buffer);
      idx++;
    }, (CHUNK / SR) * 1000);
    console.log('[TEST TONE] Sending 3s of 440Hz…');
  };

  return {
    isConnected, isRecording,
    speechEnabled, setSpeechEnabled,
    micError,
    partialTranscript,
    subtitles,
    detectedLang,
    volumeLevel,
    getAnalyserData,
    startRecording, stopRecording,
    sendConfig, clearSession,
    translateText,
    sendTestTone,
  };
}
