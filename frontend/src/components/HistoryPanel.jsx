import { LANG_NAMES } from '../constants/languages';

function formatTime(date) {
  return date instanceof Date
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
}

function labelFor(code) {
  return LANG_NAMES[code] ?? code?.toUpperCase() ?? 'Auto';
}

function exportToTxt(subtitles) {
  const lines = subtitles.map((entry) => {
    const source = labelFor(entry.sourceLang);
    const target = labelFor(entry.targetLang);
    return [
      `[${formatTime(entry.timestamp)}] ${source} -> ${target}`,
      `Original: ${entry.original}`,
      `Translation: ${entry.translated ?? '(pending)'}`,
    ].join('\n');
  });

  const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPanel({ subtitles }) {
  if (subtitles.length === 0) {
    return (
      <div className="history-empty">
        <span />
        <h2>No translation history yet</h2>
        <p>Completed transcript and translation pairs will appear here after a live or typed session.</p>
      </div>
    );
  }

  return (
    <section className="history-panel">
      <header className="history-toolbar">
        <div>
          <span>{subtitles.length} saved entries</span>
          <h1>History</h1>
        </div>
        <button onClick={() => exportToTxt(subtitles)} type="button">
          Export TXT
        </button>
      </header>

      <div className="history-list">
        {[...subtitles].reverse().map((entry) => (
          <article key={entry.id} className="history-entry">
            <header>
              <span>{formatTime(entry.timestamp)}</span>
              <strong>{labelFor(entry.sourceLang)} to {labelFor(entry.targetLang)}</strong>
            </header>
            <p>{entry.original}</p>
            {entry.translated ? (
              <p className="history-translation">{entry.translated}</p>
            ) : (
              <div className="history-loading">Translation pending</div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
