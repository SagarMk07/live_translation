import { useEffect, useMemo, useRef } from 'react';
import { LANG_NAMES } from '../constants/languages';
import AIStatusBadge from './AIStatusBadge';
import WaveformVisualizer from './WaveformVisualizer';

function languageLabel(code, fallback = 'Auto detect') {
  return LANG_NAMES[code] ?? code?.toUpperCase() ?? fallback;
}

function LiveTextPanel({ title, label, tone, text, partialText, isStreaming, placeholder, onClear, clearTick }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [text, partialText]);

  return (
    <section className={`live-text-panel ${tone}`}>
      <header className="live-panel-header">
        <div>
          <span>{label}</span>
          <h2>{title}</h2>
        </div>
        <div className="live-panel-actions">
          <div className={`live-dot ${isStreaming ? 'active' : ''}`}>
            <i />
            {isStreaming ? 'Live' : 'Ready'}
          </div>
          <button
            className="live-clear-button"
            type="button"
            onClick={onClear}
            aria-label={`Clear ${title.toLowerCase()}`}
            title="Clear live text (Ctrl+K)"
          >
            <span aria-hidden="true">x</span>
            <b>Clear</b>
          </button>
        </div>
      </header>

      <div
        key={clearTick}
        className={`live-panel-body ${clearTick ? 'was-cleared' : ''}`}
        ref={scrollRef}
      >
        {text || partialText ? (
          <p className="live-stream-text">
            {text}
            {text && partialText ? ' ' : ''}
            {partialText && <span className="live-partial">{partialText}</span>}
            {isStreaming && <span className="streaming-cursor" />}
          </p>
        ) : (
          <div className="live-empty-state">
            <span />
            <p>{placeholder}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ConversationFeed({
  subtitles,
  partialTranscript,
  isRecording,
  aiStatus,
  sourceLang,
  targetLang,
  detectedLang,
  volumeLevel,
  getAnalyserData,
  onClearLive,
  clearTick,
}) {
  const transcriptText = useMemo(
    () => subtitles.map((entry) => entry.original).filter(Boolean).join(' '),
    [subtitles]
  );

  const translationText = useMemo(
    () => subtitles.map((entry) => entry.translated).filter(Boolean).join(' '),
    [subtitles]
  );

  const hasPendingTranslation = subtitles.some((entry) => !entry.translated);
  const detectedLabel = detectedLang ? languageLabel(detectedLang.code) : 'Detecting';
  const sourceLabel = languageLabel(sourceLang);
  const targetLabel = languageLabel(targetLang, 'Target');
  const routeLabel = `${sourceLabel} to ${targetLabel}`;
  const isTranslating = aiStatus === 'translating' || hasPendingTranslation;
  const hasLiveContent = Boolean(transcriptText || translationText || partialTranscript);

  return (
    <section className="conversation-workspace live-workspace">
      <div className="ai-status-header live-status-header">
        <div className="status-visual">
          <WaveformVisualizer
            getAnalyserData={getAnalyserData}
            isActive={isRecording}
            height={54}
          />
        </div>
        <div className="status-copy">
          <AIStatusBadge status={aiStatus} />
          <h1>{isRecording ? 'Streaming translation' : hasLiveContent ? 'Live session paused' : 'Ready for live translation'}</h1>
          <p>{routeLabel}</p>
        </div>
        <div className="status-meta compact">
          <span className={`mic-indicator ${isRecording ? 'active' : ''}`}>
            <i />
            {isRecording ? 'Mic live' : 'Mic idle'}
          </span>
          <span className="language-badge">{detectedLabel}</span>
          <span className="volume-meter">
            <i style={{ width: `${Math.min(100, Math.round(volumeLevel * 100))}%` }} />
          </span>
        </div>
      </div>

      <div className="live-panels-grid">
        <LiveTextPanel
          title="Live Transcript"
          label={sourceLabel}
          tone="transcript"
          text={transcriptText}
          partialText={partialTranscript}
          isStreaming={isRecording}
          placeholder="Start speaking to stream the source transcript here."
          onClear={onClearLive}
          clearTick={clearTick}
        />
        <LiveTextPanel
          title="Live Translation"
          label={targetLabel}
          tone="translation"
          text={translationText}
          partialText={hasPendingTranslation ? 'Translating...' : ''}
          isStreaming={isRecording || isTranslating}
          placeholder="Translations will appear as one continuous live subtitle stream."
          onClear={onClearLive}
          clearTick={clearTick}
        />
      </div>
    </section>
  );
}
