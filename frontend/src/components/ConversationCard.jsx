import { LANG_NAMES } from '../constants/languages';

function formatTime(date) {
  return date instanceof Date
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';
}

function labelFor(code) {
  return LANG_NAMES[code] ?? code?.toUpperCase() ?? 'Auto';
}

export default function ConversationCard({ entry, isLatest }) {
  return (
    <article className={`conversation-card ${isLatest ? 'latest' : ''}`}>
      <header>
        <div className="card-route">
          <span>{labelFor(entry.sourceLang)}</span>
          <i />
          <span>{labelFor(entry.targetLang)}</span>
        </div>
        <div className="card-meta">
          {entry.mode === 'text' && <span>Typed</span>}
          {isLatest && <span className="live-chip">Newest</span>}
          <time>{formatTime(entry.timestamp)}</time>
        </div>
      </header>

      <div className="conversation-copy">
        <div>
          <span>Original</span>
          <p>{entry.original}</p>
        </div>
        <div className="translated-copy">
          <span>Translation</span>
          {entry.translated ? (
            <p>{entry.translated}</p>
          ) : (
            <div className="translation-loading">
              <i />
              <i />
              <i />
              Generating translation
            </div>
          )}
        </div>
      </div>

      {entry.confidence < 0.95 && (
        <footer>
          <span>Confidence</span>
          <div>
            <i style={{ width: `${Math.round(entry.confidence * 100)}%` }} />
          </div>
          <strong>{Math.round(entry.confidence * 100)}%</strong>
        </footer>
      )}
    </article>
  );
}
