import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAudioStream } from './hooks/useAudioStream';
import { LANG_NAMES } from './constants/languages';
import ControlPanel from './components/ControlPanel';
import ConversationFeed from './components/ConversationFeed';
import BottomBar from './components/BottomBar';
import HistoryPanel from './components/HistoryPanel';
import './index.css';

const TABS = [
  { id: 'voice', label: 'Voice' },
  { id: 'text', label: 'Text' },
  { id: 'history', label: 'History' },
];

function exportConversation(entries) {
  const lines = entries.map((entry) => {
    const time = entry.timestamp instanceof Date
      ? entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '';
    const source = LANG_NAMES[entry.sourceLang] ?? entry.sourceLang ?? 'Auto';
    const target = LANG_NAMES[entry.targetLang] ?? entry.targetLang ?? 'Target';
    return [
      `[${time}] ${source} -> ${target}`,
      `Original: ${entry.original}`,
      `Translation: ${entry.translated ?? '(pending)'}`,
    ].join('\n');
  });

  const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `conversation-${new Date().toISOString().slice(0, 10)}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
    </div>
  );
}

function ConnectionStatus({ connected }) {
  return (
    <div className={`connection-pill ${connected ? 'is-online' : 'is-offline'}`}>
      <span />
      {connected ? 'Connected' : 'Reconnecting'}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('voice');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [gender, setGender] = useState('male');
  const [speed, setSpeed] = useState(1.0);
  const [inputText, setInputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typedEntries, setTypedEntries] = useState([]);
  const [liveClearedAt, setLiveClearedAt] = useState(null);
  const [liveClearTick, setLiveClearTick] = useState(0);

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
    sendConfig, clearSession, clearLiveText,
    translateText,
  } = useAudioStream();

  useEffect(() => {
    sendConfig({ targetLang, sourceLang, gender, speed });
  }, [targetLang, sourceLang, gender, speed, sendConfig]);

  const conversationEntries = useMemo(
    () => [...subtitles, ...typedEntries].sort((a, b) => a.timestamp - b.timestamp),
    [subtitles, typedEntries]
  );

  const liveEntries = useMemo(() => {
    if (!liveClearedAt) return conversationEntries;
    return conversationEntries.filter((entry) => entry.timestamp > liveClearedAt);
  }, [conversationEntries, liveClearedAt]);

  const aiStatus = useMemo(() => {
    if (isTranslating) return 'translating';
    if (!isRecording) return 'idle';
    const hasPending = liveEntries.some((entry) => entry.translated === null);
    if (hasPending) return 'translating';
    if (partialTranscript || volumeLevel > 0.04) return 'listening';
    return 'listening';
  }, [isRecording, isTranslating, liveEntries, partialTranscript, volumeLevel]);

  const handleTranslateText = async () => {
    const text = inputText.trim();
    if (!text || isTranslating) return;

    setIsTranslating(true);
    try {
      const result = await translateText(text);
      const translated = result?.translated ?? result?.text ?? result?.translation ?? '';
      setTypedEntries((prev) => [
        ...prev,
        {
          id: `typed-${Date.now()}`,
          timestamp: new Date(),
          original: text,
          translated: translated || '(translation unavailable)',
          sourceLang: sourceLang === 'auto' ? detectedLang?.code ?? 'auto' : sourceLang,
          targetLang,
          confidence: 1,
          mode: 'text',
        },
      ]);
      setInputText('');
    } catch (error) {
      console.error('[TEXT]', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleClearSession = () => {
    clearSession();
    setTypedEntries([]);
    setLiveClearedAt(null);
    setLiveClearTick((value) => value + 1);
  };

  const handleClearLive = useCallback(() => {
    clearLiveText();
    setLiveClearedAt(new Date());
    setLiveClearTick((value) => value + 1);
  }, [clearLiveText]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (activeTab !== 'history') handleClearLive();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleClearLive]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <button
            className="icon-button sidebar-toggle"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="Toggle controls"
          >
            <span className="hamburger" />
          </button>
          <BrandMark />
          <div>
            <p className="app-name">LinguaAI</p>
            <p className="app-subtitle">Real-time multilingual translator</p>
          </div>
        </div>

        <nav className="mode-tabs" aria-label="Translation mode">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <ConnectionStatus connected={isConnected} />
          <button className="icon-button" onClick={handleClearSession} aria-label="Clear conversation">
            <span className="clear-icon" />
          </button>
          <button className="icon-button" aria-label="Settings">
            <span className="settings-icon" />
          </button>
        </div>
      </header>

      {micError && (
        <div className="mic-error" role="status">
          {micError}
        </div>
      )}

      <div className="dashboard-layout">
        <div
          className={`sidebar-scrim ${sidebarOpen ? 'is-visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <ControlPanel
            isConnected={isConnected}
            isRecording={isRecording}
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            gender={gender}
            setGender={setGender}
            speed={speed}
            setSpeed={setSpeed}
            speechEnabled={speechEnabled}
            setSpeechEnabled={setSpeechEnabled}
            detectedLang={detectedLang}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onExportHistory={() => exportConversation(conversationEntries)}
            hasHistory={conversationEntries.length > 0}
          />
        </aside>

        <main className="main-workspace">
          {activeTab === 'history' ? (
            <div className="history-workspace">
              <HistoryPanel subtitles={conversationEntries} />
            </div>
          ) : (
            <>
              <ConversationFeed
                subtitles={liveEntries}
                partialTranscript={partialTranscript}
                isRecording={isRecording}
                aiStatus={aiStatus}
                sourceLang={sourceLang}
                targetLang={targetLang}
                detectedLang={detectedLang}
                volumeLevel={volumeLevel}
                getAnalyserData={getAnalyserData}
                onClearLive={handleClearLive}
                clearTick={liveClearTick}
              />
              <BottomBar
                isConnected={isConnected}
                isRecording={isRecording}
                speechEnabled={speechEnabled}
                setSpeechEnabled={setSpeechEnabled}
                volumeLevel={volumeLevel}
                getAnalyserData={getAnalyserData}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                inputText={inputText}
                setInputText={setInputText}
                onTranslateText={handleTranslateText}
                isTranslating={isTranslating}
                textMode={activeTab === 'text'}
              />
            </>
          )}
        </main>
      </div>

      <nav className="mobile-tabs" aria-label="Mobile navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
