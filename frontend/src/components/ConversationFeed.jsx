import { useEffect, useRef } from 'react';
import { LANG_NAMES } from '../constants/languages';
import AIStatusBadge from './AIStatusBadge';
import ConversationCard from './ConversationCard';
import WaveformVisualizer from './WaveformVisualizer';

function languageLabel(code, fallback = 'Auto detect') {
  return LANG_NAMES[code] ?? code?.toUpperCase() ?? fallback;
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
}) {
  const bottomRef = useRef(null);
  const isEmpty = subtitles.length === 0 && !partialTranscript;
  const detectedLabel = detectedLang ? languageLabel(detectedLang.code) : 'Detecting';
  const routeLabel = `${languageLabel(sourceLang)} -> ${languageLabel(targetLang, 'Target')}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [subtitles, partialTranscript]);

  return (
    <section className="conversation-workspace">
      <div className="ai-status-header">
        <div className="status-visual">
          <WaveformVisualizer
            getAnalyserData={getAnalyserData}
            isActive={isRecording}
            height={54}
          />
        </div>
        <div className="status-copy">
          <AIStatusBadge status={aiStatus} />
          <h1>{aiStatus === 'idle' ? 'Ready for translation' : aiStatus === 'translating' ? 'Translating in real time' : 'Listening...'}</h1>
          <p>{routeLabel}</p>
        </div>
        <div className="status-meta">
          <span className="language-badge">{detectedLabel}</span>
          <span className={`mic-indicator ${isRecording ? 'active' : ''}`}>
            <i />
            Mic {isRecording ? 'live' : 'idle'}
          </span>
          <span className="volume-meter">
            <i style={{ width: `${Math.min(100, Math.round(volumeLevel * 100))}%` }} />
          </span>
        </div>
      </div>

      <div className="feed-scroll">
        {isEmpty && (
          <div className="empty-feed">
            <div className={`empty-mic ${isRecording ? 'active' : ''}`}>
              <span />
            </div>
            <h2>{isRecording ? 'Listening for speech' : 'Start a multilingual session'}</h2>
            <p>
              Conversation cards will appear here with originals, translations, timestamps,
              and detected language routing.
            </p>
            <div className="empty-shimmer">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {subtitles.map((entry, index) => (
          <ConversationCard
            key={entry.id}
            entry={entry}
            isLatest={index === subtitles.length - 1}
          />
        ))}

        {partialTranscript && (
          <div className="partial-card">
            <div>
              <span className="typing-dot" />
              <strong>Live transcript</strong>
            </div>
            <p>
              {partialTranscript}
              <span className="typing-cursor">|</span>
            </p>
          </div>
        )}

        <div ref={bottomRef} className="scroll-anchor" />
      </div>
    </section>
  );
}
