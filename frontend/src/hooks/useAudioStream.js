import { useEffect, useRef, useState } from 'react';

function createAudioQueue() {
  const queue = [];
  let isPlaying = false;

  async function playNext() {
    if (isPlaying || queue.length === 0) return;

    isPlaying = true;
    const blob = queue.shift();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const done = () => {
      URL.revokeObjectURL(url);
      isPlaying = false;
      playNext();
    };

    audio.onended = done;
    audio.onerror = done;

    try {
      await audio.play();
    } catch {
      done();
    }
  }

  return {
    enqueue(blob) {
      queue.push(blob);
      playNext();
    },
    clear() {
      queue.length = 0;
      isPlaying = false;
    },
  };
}

function dispatchMessage(event, handlers, audioQueue, isSpeechEnabled) {
  if (event.data instanceof Blob) {
    if (isSpeechEnabled()) audioQueue.enqueue(event.data);
    return;
  }

  try {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'partial':
        handlers.partial(data.text);
        break;
      case 'final':
        handlers.final(data.text);
        break;
      case 'translation':
        handlers.translation(data.text);
        break;
      case 'error':
        console.warn('[WS]', data.message);
        break;
      default:
        console.warn('[WS] Unknown type:', data.type);
    }
  } catch (error) {
    console.error('[WS] Parse error:', error);
  }
}

export function useAudioStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [micError, setMicError] = useState(null);  // null = ok, string = problem

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);  // ScriptProcessor (unused now, kept for compat)
  const workletRef = useRef(null);    // AudioWorkletNode (active processor)
  const micStreamRef = useRef(null);
  const isRecordingRef = useRef(false);
  const speechEnabledRef = useRef(true);
  const targetLangRef = useRef('es');
  const audioQueueRef = useRef(createAudioQueue());
  const reconnectTimerRef = useRef(null);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    speechEnabledRef.current = speechEnabled;
  }, [speechEnabled]);

  useEffect(() => {
    isMountedRef.current = true;

    const connectWs = () => {
      if (isConnectingRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

      isConnectingRef.current = true;
      const ws = new WebSocket('ws://localhost:8000/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setIsConnected(true);
        clearTimeout(reconnectTimerRef.current);
        ws.send(JSON.stringify({ type: 'config', target_lang: targetLangRef.current }));
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        dispatchMessage(
          event,
          {
            partial: (text) => setPartialTranscript(text),
            final: (text) => {
              setFinalTranscripts((prev) => [...prev, text]);
              setPartialTranscript('');
            },
            translation: (text) => setTranslations((prev) => [...prev, text]),
          },
          audioQueueRef.current,
          () => speechEnabledRef.current
        );
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        setIsConnected(false);
        if (isMountedRef.current) {
          reconnectTimerRef.current = setTimeout(connectWs, 3000);
        }
      };

      ws.onerror = (error) => {
        isConnectingRef.current = false;
        console.error('[WS] Error:', error);
      };
    };

    connectWs();

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      audioQueueRef.current.clear();
    };
  }, []);

  const sendConfig = (lang) => {
    targetLangRef.current = lang;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'config', target_lang: lang }));
    }
  };

  // Downsample Float32 from nativeRate → 16000 Hz
  const downsampleBuffer = (buffer, fromRate, toRate) => {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.round(i * ratio)];
    }
    return result;
  };

  const startRecording = async () => {
    if (isRecordingRef.current) return;

    try {
      // ── 1. Request permission first with a plain call ─────────────────────
      // Browsers return empty labels/deviceIds until permission is granted.
      // Doing device selection BEFORE permission causes OverconstrainedError.
      let permStream;
      try {
        permStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[MIC] Permission granted ✅');
      } catch (permErr) {
        throw new Error(`Microphone permission denied: ${permErr.message}`);
      }

      // ── 2. Enumerate devices now that we have real labels/IDs ─────────────
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      console.log('[MIC] Available audio inputs:');
      audioInputs.forEach((d, i) => console.log(`  [${i}] label="${d.label}" deviceId="${d.deviceId}"`));

      // Avoid virtual/loopback/communications devices — they often output silence
      const SKIP_PATTERNS = /virtual|loopback|cable|voicemeeter|stereo mix|what u hear|communications/i;
      const physicalMic = audioInputs.find(
        (d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications' && !SKIP_PATTERNS.test(d.label)
      );

      console.log('[MIC] Selected device:', physicalMic?.label ?? 'OS default');

      // Stop the permission-only stream; we'll open the real one next
      permStream.getTracks().forEach((t) => t.stop());

      // ── 3. Get the real mic stream (specific device or default) ───────────
      const audioConstraints = physicalMic
        ? { deviceId: { exact: physicalMic.deviceId }, echoCancellation: true, noiseSuppression: true }
        : { echoCancellation: true, noiseSuppression: true };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      micStreamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      console.log('MIC DEVICE:', track?.label);
      console.log('TRACK ENABLED:', track?.enabled);
      console.log('TRACK MUTED:', track?.muted);
      console.log('TRACK READY STATE:', track?.readyState);

      // Warn immediately if OS has muted the track
      track.addEventListener('mute', () => console.warn('[MIC] ⚠️  Track was MUTED by OS/browser'));
      track.addEventListener('unmute', () => console.log('[MIC] Track unmuted'));

      if (!track?.enabled || track?.readyState !== 'live') {
        throw new Error(`Mic track not live — enabled:${track?.enabled} readyState:${track?.readyState}`);
      }

      // ── 4. Create AudioContext at NATIVE rate ──────────────────────────────
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      // ⚠️  Do NOT force sampleRate:16000 — causes all-zero buffers on Chrome/Windows
      const audioContext = new AudioContextCtor();
      audioCtxRef.current = audioContext;

      await audioContext.resume();
      console.log('[MIC] AudioContext state:', audioContext.state, '| nativeSampleRate:', audioContext.sampleRate);

      if (audioContext.state !== 'running') {
        await new Promise((resolve) => {
          audioContext.onstatechange = () => {
            if (audioContext.state === 'running') resolve();
          };
          audioContext.resume().then(resolve);
        });
        console.log('[MIC] AudioContext forced to RUNNING');
      }

      // ── 5. Build pipeline with AudioWorklet (replaces deprecated ScriptProcessor) ──
      const nativeRate = audioContext.sampleRate;
      const source = audioContext.createMediaStreamSource(stream);

      // Load the worklet module from public/
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      workletRef.current = workletNode;
      console.log('[MIC] AudioWorklet loaded ✅');

      // source → worklet → destination (destination keeps the graph alive)
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      console.log('[MIC] source → workletNode → destination connected');

      // ── 6. Analyser to verify signal (runs every 500ms for 5s) ────────────
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const analyserData = new Uint8Array(analyser.fftSize);
      let signalCheckCount = 0;
      const signalInterval = setInterval(() => {
        analyser.getByteTimeDomainData(analyserData);
        const peak = Math.max(...analyserData);
        console.log('[MIC] Analyser peak (128=silence, >128=real signal):', peak);
        if (++signalCheckCount >= 10) clearInterval(signalInterval);
      }, 500);

      // ── 7. Receive PCM from the audio thread ──────────────────────────────
      let callbackCount = 0;
      let silentCallbacks = 0;
      let silenceAlertSent = false;
      const SILENCE_THRESHOLD = 0.0001;
      const SILENCE_ALERT_AFTER = 15;  // ~1.25s at 4096 samples/85ms each

      workletNode.port.onmessage = (event) => {
        // event.data is ArrayBuffer (zero-copy transfer from audio thread)
        const float32 = new Float32Array(event.data);

        // Compute peak
        let peak = 0;
        for (let i = 0; i < float32.length; i++) {
          const v = Math.abs(float32[i]);
          if (v > peak) peak = v;
        }

        // Detailed log for first 5 chunks
        if (callbackCount < 5) {
          callbackCount++;
          const rms = Math.sqrt(float32.reduce((s, v) => s + v * v, 0) / float32.length);
          console.log(`[WORKLET] chunk #${callbackCount} | peak=${peak.toFixed(6)} | rms=${rms.toFixed(6)}`);
          console.log('[WORKLET] first 10 samples:', Array.from(float32.slice(0, 10)).map(v => v.toFixed(6)));
        }

        // Silence detection
        if (peak < SILENCE_THRESHOLD) {
          silentCallbacks++;
          if (silentCallbacks >= SILENCE_ALERT_AFTER && !silenceAlertSent) {
            silenceAlertSent = true;
            const msg = '⚠️ Mic silence detected. Check: Win Settings → Privacy → Microphone → allow browser. Also: Sound Settings → Input volume > 0.';
            console.error('[MIC] SILENCE DETECTED:', msg);
            setMicError(msg);
          }
        } else {
          silentCallbacks = 0;
          if (silenceAlertSent) { silenceAlertSent = false; setMicError(null); }
        }

        // Downsample native rate → 16000 Hz
        const downsampled = downsampleBuffer(float32, nativeRate, 16000);
        const pcm = new Int16Array(downsampled.length);
        for (let i = 0; i < downsampled.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, downsampled[i] * 32767));
        }

        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          if (callbackCount <= 5) console.log('SENDING AUDIO:', pcm.byteLength, 'bytes');
          ws.send(pcm.buffer);
        } else {
          if (callbackCount <= 5) console.log('WS NOT READY — state:', ws?.readyState);
        }
      };

      isRecordingRef.current = true;
      setIsRecording(true);
      setMicError(null);
      console.log('[MIC] Pipeline started ✅ AudioWorklet (native', nativeRate, 'Hz → 16000 Hz)');

    } catch (err) {
      console.error('[MIC] startRecording failed:', err);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      try { workletRef.current?.disconnect(); } catch {}
      workletRef.current = null;
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
    }
  };


  const stopRecording = () => {
    isRecordingRef.current = false;

    try { workletRef.current?.disconnect(); } catch {}
    workletRef.current = null;

    try { processorRef.current?.disconnect(); } catch {}
    processorRef.current = null;

    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    setIsRecording(false);
    setPartialTranscript('');
    console.log('[MIC] Stopped');
  };

  const clearSession = () => {
    setFinalTranscripts([]);
    setTranslations([]);
    setPartialTranscript('');
    audioQueueRef.current.clear();
  };

  /**
   * Sends 3 seconds of a 440Hz sine wave directly over WebSocket,
   * bypassing the mic entirely. Used to verify the pipeline end-to-end.
   * If backend logs "peak > 0" for this → pipeline is fine, mic hardware is broken.
   * If backend logs "peak = 0" even for this → WebSocket binary send is broken.
   */
  const sendTestTone = () => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) {
      console.warn('[TEST TONE] WebSocket not open');
      return;
    }

    const SAMPLE_RATE = 16000;
    const FREQUENCY = 440;       // Hz — A4 note, clearly audible to Deepgram
    const AMPLITUDE = 16000;     // half of Int16 max (32767)
    const CHUNK_SAMPLES = 1365;  // same size as our normal downsampled chunk
    const TOTAL_CHUNKS = Math.ceil((SAMPLE_RATE * 3) / CHUNK_SAMPLES); // 3 seconds

    console.log('[TEST TONE] Sending 3 seconds of 440Hz sine wave…');
    let chunkIndex = 0;

    const timer = setInterval(() => {
      if (chunkIndex >= TOTAL_CHUNKS) {
        clearInterval(timer);
        console.log('[TEST TONE] Done. Check backend for peak > 0.');
        return;
      }

      const pcm = new Int16Array(CHUNK_SAMPLES);
      const offset = chunkIndex * CHUNK_SAMPLES;
      for (let i = 0; i < CHUNK_SAMPLES; i++) {
        const t = (offset + i) / SAMPLE_RATE;
        pcm[i] = Math.round(Math.sin(2 * Math.PI * FREQUENCY * t) * AMPLITUDE);
      }

      const peak = Math.max(...pcm);
      if (chunkIndex < 3) console.log(`[TEST TONE] chunk #${chunkIndex + 1} peak=${peak}`);

      ws.send(pcm.buffer);
      chunkIndex++;
    }, (CHUNK_SAMPLES / SAMPLE_RATE) * 1000); // ~85ms per chunk
  };

  return {
    isConnected,
    isRecording,
    speechEnabled,
    setSpeechEnabled,
    asrSupported: true,
    micError,
    startRecording,
    stopRecording,
    sendConfig,
    clearSession,
    sendTestTone,
    partialTranscript,
    finalTranscripts,
    translations,
  };
}
