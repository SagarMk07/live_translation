import { useState, useEffect } from 'react';
import { useAudioStream } from './hooks/useAudioStream';
import ControlPanel from './components/ControlPanel';
import SubtitleFeed from './components/SubtitleFeed';
import WaveformVisualizer from './components/WaveformVisualizer';
import TextInputMode from './components/TextInputMode';
import HistoryPanel from './components/HistoryPanel';
import './index.css';

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'voice',   label: '🎙 Voice',   desc: 'Real-time speech translation' },
  { id: 'text',    label: '✍️ Text',    desc: 'Type text to translate'       },
  { id: 'history', label: '📜 History', desc: 'All translations'             },
];

// ── Connection pill ──────────────────────────────────────────────────────────
function ConnectionPill({ connected }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
      ${connected
        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
        : 'bg-red-500/10 border-red-500/25 text-red-400'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-red-400'}`} />
      {connected ? 'Connected' : 'Reconnecting…'}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]   = useState('voice');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [gender, setGender]         = useState('male');
  const [speed, setSpeed]           = useState(1.0);

  const {
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
  } = useAudioStream();

  // Sync config changes to backend
  useEffect(() => {
    sendConfig({ targetLang, sourceLang, gender, speed });
  }, [targetLang, sourceLang, gender, speed, isConnected]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080912', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Background glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/6">
        <div className="max-w-7xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
              🌐
            </div>
            <div>
              <h1 className="text-base font-bold leading-none">
                <span className="gradient-text">LinguaAI</span>
              </h1>
              <p className="text-[10px] text-slate-600 leading-none mt-0.5">Real-time AI Translator</p>
            </div>
          </div>

          {/* Tab bar (desktop: header) */}
          <nav className="hidden sm:flex items-center gap-1 glass rounded-xl p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/25'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                title={tab.desc}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <ConnectionPill connected={isConnected} />
            <button
              onClick={clearSession}
              className="text-xs font-medium text-slate-500 hover:text-red-400 border border-white/8 hover:border-red-500/30 px-3 py-1.5 rounded-lg transition-all bg-white/3 hover:bg-red-500/5"
            >
              🗑 Clear
            </button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="sm:hidden flex border-t border-white/6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all border-b-2
                ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Mic error banner ────────────────────────────────────────────────── */}
      {micError && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-300 text-sm animate-fade-in">
          {micError}
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 gap-5 min-h-0">

        {/* ── VOICE TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'voice' && (
          <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

            {/* Left: Control Panel */}
            <div className="w-full lg:w-72 xl:w-80 shrink-0">
              <div className="glass rounded-2xl p-5 sticky top-24">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Controls</h2>
                <ControlPanel
                  isConnected={isConnected}
                  isRecording={isRecording}
                  sourceLang={sourceLang}  setSourceLang={setSourceLang}
                  targetLang={targetLang}  setTargetLang={setTargetLang}
                  gender={gender}          setGender={setGender}
                  speed={speed}            setSpeed={setSpeed}
                  speechEnabled={speechEnabled} setSpeechEnabled={setSpeechEnabled}
                  detectedLang={detectedLang}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                />

                {/* Debug test tone */}
                <button
                  onClick={sendTestTone}
                  disabled={!isConnected}
                  className="mt-4 w-full text-xs text-slate-600 hover:text-slate-400 py-1.5 transition-all disabled:opacity-30"
                  title="Send a 440Hz test tone to verify WebSocket pipeline"
                >
                  🔊 Test Pipeline
                </button>
              </div>
            </div>

            {/* Right: Subtitle Feed */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Waveform */}
              <div className={`glass rounded-2xl p-4 mb-4 transition-all duration-500 ${isRecording ? 'border border-red-500/20' : 'border border-white/5'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isRecording && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-dot" />
                        LIVE
                      </span>
                    )}
                    <span className="text-xs text-slate-600">
                      {isRecording ? 'Microphone active' : 'Microphone idle'}
                    </span>
                  </div>
                  {isRecording && (
                    <span className="text-xs text-slate-600">
                      Volume: {Math.round(volumeLevel * 100)}%
                    </span>
                  )}
                </div>
                <WaveformVisualizer
                  getAnalyserData={getAnalyserData}
                  isActive={isRecording}
                  height={64}
                />
              </div>

              {/* Subtitle panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Original transcript */}
                <div className="glass rounded-2xl flex flex-col min-h-64 md:min-h-0">
                  <div className="px-4 py-3 border-b border-white/6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Live Transcript
                    </span>
                    {detectedLang && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        {detectedLang.code?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <SubtitleFeed
                    subtitles={subtitles.map(s => ({ ...s, translated: undefined }))}
                    partialTranscript={partialTranscript}
                    isRecording={isRecording}
                  />
                </div>

                {/* Translated output */}
                <div className="glass rounded-2xl flex flex-col min-h-64 md:min-h-0"
                  style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                  <div className="px-4 py-3 border-b border-indigo-500/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                      Translation
                    </span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      {targetLang.toUpperCase()}
                    </span>
                  </div>
                  <SubtitleFeed
                    subtitles={subtitles.map(s => ({ ...s, original: s.translated ?? '' }))}
                    partialTranscript=""
                    isRecording={isRecording}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TEXT TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'text' && (
          <div className="flex-1">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2">
                <span>✍️</span> Type Text to Translate
              </h2>
              <TextInputMode
                isConnected={isConnected}
                translateText={translateText}
              />
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="flex-1">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2">
                <span>📜</span> Translation History
              </h2>
              <HistoryPanel subtitles={subtitles} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
