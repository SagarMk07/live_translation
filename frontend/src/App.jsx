import { useAudioStream } from './hooks/useAudioStream';
import { useState, useEffect, useRef } from 'react';
import './App.css';

const LANGUAGES = [
  { code: 'es', label: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', label: 'French',     flag: '🇫🇷' },
  { code: 'de', label: 'German',     flag: '🇩🇪' },
  { code: 'hi', label: 'Hindi',      flag: '🇮🇳' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵' },
  { code: 'ar', label: 'Arabic',     flag: '🇸🇦' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru', label: 'Russian',    flag: '🇷🇺' },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷' },
  { code: 'it', label: 'Italian',    flag: '🇮🇹' },
];

// ─── Status Pill ─────────────────────────────────────────────────────────────
function StatusPill({ connected }) {
  return (
    <div className={`status-pill ${connected ? 'status-connected' : 'status-disconnected'}`}>
      <span className={`status-dot ${connected ? 'dot-connected' : 'dot-disconnected'}`} />
      {connected ? 'Connected' : 'Reconnecting…'}
    </div>
  );
}

// ─── Transcript Panel ─────────────────────────────────────────────────────────
function TranscriptPanel({ finalTranscripts, partialTranscript }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); },
    [finalTranscripts, partialTranscript]);

  return (
    <div className="panel transcript-panel">
      <div className="panel-label">🎙 Live Transcript · English</div>
      <div className="panel-content">
        {finalTranscripts.length === 0 && !partialTranscript && (
          <p className="placeholder-text">Start speaking — subtitles will appear here…</p>
        )}
        {finalTranscripts.map((t, i) => (
          <p key={i} className="transcript-final">{t}</p>
        ))}
        {partialTranscript && (
          <p className="transcript-partial">{partialTranscript}<span className="cursor-blink">|</span></p>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── Translation Panel ────────────────────────────────────────────────────────
function TranslationPanel({ translations, targetLang }) {
  const endRef = useRef(null);
  const lang   = LANGUAGES.find(l => l.code === targetLang);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [translations]);

  return (
    <div className="panel translation-panel">
      <div className="panel-label">
        {lang ? `${lang.flag} Translation · ${lang.label}` : `Translation · ${targetLang}`}
      </div>
      <div className="panel-content">
        {translations.length === 0 && (
          <p className="placeholder-text">Translation will appear per sentence…</p>
        )}
        {translations.map((t, i) => (
          <p key={i} className="translation-text animate-in">{t}</p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const {
    isConnected, isRecording,
    speechEnabled, setSpeechEnabled,
    asrSupported, micError,
    startRecording, stopRecording,
    sendConfig, clearSession, sendTestTone,
    partialTranscript, finalTranscripts, translations,
  } = useAudioStream();

  const [targetLang, setTargetLang] = useState('es');

  useEffect(() => {
    if (isConnected) sendConfig(targetLang);
  }, [targetLang, isConnected, sendConfig]);

  return (
    <div className="app">

      {/* ── Mic silence error banner ── */}
      {micError && (
        <div className="browser-warning" style={{ background: 'rgba(255,80,0,0.15)', borderColor: '#ff5000' }}>
          {micError}
        </div>
      )}

      {/* ── Browser warning ── */}
      {!asrSupported && (
        <div className="browser-warning">
          ⚠️ Speech recognition requires <strong>Google Chrome</strong>. Other browsers are not supported.
        </div>
      )}

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🌐</span>
          <span className="brand-name">
            <span className="brand-accent">Multilingual</span> Translator
          </span>
        </div>

        <div className="header-controls">
          <StatusPill connected={isConnected} />

          <select
            id="lang-select"
            value={targetLang}
            onChange={e => setTargetLang(e.target.value)}
            className="lang-select"
            disabled={!isConnected}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>

          <button
            id="speech-toggle"
            onClick={() => setSpeechEnabled(v => !v)}
            className={`speech-toggle ${speechEnabled ? 'speech-on' : 'speech-off'}`}
          >
            {speechEnabled ? '🔊 Audio ON' : '🔇 Audio OFF'}
          </button>

          <button id="clear-btn" onClick={clearSession} className="clear-btn">
            🗑 Clear
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">

        {/* Record row */}
        <div className="record-row">
          <button
            id="record-btn"
            onClick={isRecording ? stopRecording : () => startRecording()}
            disabled={!isConnected || !asrSupported}
            className={`record-btn ${isRecording ? 'record-btn-stop' : 'record-btn-start'}`}
          >
            {isRecording ? (
              <><span className="recording-pulse" /> Stop Recording</>
            ) : (
              <><span className="mic-icon">🎤</span> Start Recording</>
            )}
          </button>

          {isRecording && <span className="live-badge">● LIVE</span>}

          {/* Debug: test pipeline without mic */}
          <button
            id="test-tone-btn"
            onClick={sendTestTone}
            disabled={!isConnected}
            className="clear-btn"
            title="Sends a 440Hz sine wave to verify the WebSocket→Deepgram pipeline works without the mic"
          >
            🔊 Test Pipeline
          </button>
        </div>

        {/* How it works hint */}
        {!isRecording && finalTranscripts.length === 0 && (
          <p className="hint-text">
            Press <strong>Start Recording</strong>, then speak in English. Translations appear per sentence.
          </p>
        )}

        {/* Panels */}
        <div className="panels">
          <TranscriptPanel
            finalTranscripts={finalTranscripts}
            partialTranscript={partialTranscript}
          />
          <TranslationPanel translations={translations} targetLang={targetLang} />
        </div>
      </main>
    </div>
  );
}

export default App;
