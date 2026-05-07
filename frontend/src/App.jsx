import { useState, useEffect, useMemo } from 'react';
import { useAudioStream } from './hooks/useAudioStream';
import ControlPanel from './components/ControlPanel';
import ConversationFeed from './components/ConversationFeed';
import AIStatusBadge from './components/AIStatusBadge';
import BottomBar from './components/BottomBar';
import ClassroomNotes from './components/ClassroomNotes';
import HistoryPanel from './components/HistoryPanel';
import './index.css';

const TABS = [
  { id: 'live',    icon: '🔴', label: 'Live',    shortLabel: 'Live'    },
  { id: 'notes',   icon: '📚', label: 'Notes',   shortLabel: 'Notes'   },
  { id: 'history', icon: '📜', label: 'History', shortLabel: 'History' },
];

function ConnectionPill({ connected }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all
      ${connected
        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
        : 'bg-red-500/10    border-red-500/25    text-red-400'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {connected ? 'Online' : 'Connecting'}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab]   = useState('live');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [gender, setGender]         = useState('male');
  const [speed, setSpeed]           = useState(1.0);
  const [inputText, setInputText]   = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Sync config
  useEffect(() => {
    sendConfig({ targetLang, sourceLang, gender, speed });
  }, [targetLang, sourceLang, gender, speed, isConnected]);

  // Derive AI status from state
  const aiStatus = useMemo(() => {
    if (!isRecording) return 'idle';
    const hasPending = subtitles.some(s => s.translated === null);
    if (hasPending) return 'translating';
    if (partialTranscript || volumeLevel > 0.04) return 'listening';
    return 'listening';
  }, [isRecording, subtitles, partialTranscript, volumeLevel]);

  // Typed translation via WebSocket
  const handleTranslateText = async () => {
    if (!inputText.trim() || isTranslating) return;
    setIsTranslating(true);
    try {
      const result = await translateText(inputText.trim());
      if (result?.translated) {
        // Inject as a subtitle card
        // (the hook already handles text_translation_result via pendingTextRequests)
      }
    } catch (e) {
      console.error('[TEXT]', e);
    } finally {
      setIsTranslating(false);
      setInputText('');
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #06070f 0%, #0a0b18 50%, #080d16 100%)', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Background blobs ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/3 w-[700px] h-[400px] opacity-[0.05] rounded-full"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] opacity-[0.03] rounded-full"
          style={{ background: 'radial-gradient(ellipse, #06b6d4 0%, transparent 70%)' }} />
      </div>

      {/* ──────────────────────── HEADER ──────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-white/6 glass-strong z-50">
        <div className="flex items-center px-4 py-2.5 gap-4">

          {/* Sidebar toggle + brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all text-sm"
              title="Toggle sidebar"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
                🌐
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold gradient-text leading-none">LinguaAI</div>
                <div className="text-[10px] text-slate-600 leading-none mt-0.5">AI Classroom Translator</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 ml-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/25'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right section */}
          <div className="ml-auto flex items-center gap-2">
            {/* AI Status badge (only in live tab) */}
            {activeTab === 'live' && (
              <div className="hidden md:block">
                <AIStatusBadge status={aiStatus} />
              </div>
            )}

            <ConnectionPill connected={isConnected} />

            {/* Speaker toggle */}
            <button
              onClick={() => setSpeechEnabled(v => !v)}
              className={`text-sm w-8 h-8 rounded-lg flex items-center justify-center border transition-all
                ${speechEnabled
                  ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                  : 'border-white/8 text-slate-500 bg-white/3 hover:text-slate-300'
                }`}
              title={speechEnabled ? 'Mute audio' : 'Unmute audio'}
            >
              {speechEnabled ? '🔊' : '🔇'}
            </button>

            {/* Clear */}
            <button
              onClick={clearSession}
              className="text-xs font-medium text-slate-500 hover:text-red-400 border border-white/8 hover:border-red-500/30 px-2.5 py-1.5 rounded-lg transition-all bg-white/3"
              title="Clear session"
            >
              🗑
            </button>
          </div>
        </div>

        {/* Mobile AI status */}
        {activeTab === 'live' && (
          <div className="md:hidden flex px-4 pb-2">
            <AIStatusBadge status={aiStatus} />
          </div>
        )}
      </header>

      {/* Mic error banner */}
      {micError && (
        <div className="flex-shrink-0 mx-4 mt-2 px-4 py-2 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-300 text-xs animate-fade-in z-40">
          ⚠️ {micError}
        </div>
      )}

      {/* ──────────────────────── BODY ────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className={`flex-shrink-0 border-r border-white/6 glass flex flex-col transition-all duration-300 overflow-hidden
          ${sidebarOpen ? 'w-64 xl:w-72' : 'w-0'}`}>
          {sidebarOpen && (
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">Controls</p>
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
              <button
                onClick={sendTestTone}
                disabled={!isConnected}
                className="mt-3 w-full text-xs text-slate-700 hover:text-slate-500 py-1.5 transition-all disabled:opacity-30 text-center"
                title="Send 440Hz test tone to check pipeline"
              >
                🔊 Test Pipeline
              </button>
            </div>
          )}
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* LIVE tab */}
          {activeTab === 'live' && (
            <>
              <ConversationFeed
                subtitles={subtitles}
                partialTranscript={partialTranscript}
                isRecording={isRecording}
                aiStatus={aiStatus}
              />
              <BottomBar
                isConnected={isConnected}
                isRecording={isRecording}
                volumeLevel={volumeLevel}
                getAnalyserData={getAnalyserData}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                inputText={inputText}
                setInputText={setInputText}
                onTranslateText={handleTranslateText}
                isTranslating={isTranslating}
              />
            </>
          )}

          {/* NOTES tab */}
          {activeTab === 'notes' && (
            <div className="flex-1 overflow-y-auto p-5">
              <ClassroomNotes subtitles={subtitles} isConnected={isConnected} />
            </div>
          )}

          {/* HISTORY tab */}
          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-5">
              <HistoryPanel subtitles={subtitles} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
