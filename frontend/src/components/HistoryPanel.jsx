import { LANG_NAMES } from '../constants/languages';

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function exportToTxt(subtitles) {
  const lines = subtitles.map(s =>
    `[${formatTime(s.timestamp)}] [${LANG_NAMES[s.sourceLang] ?? s.sourceLang} → ${LANG_NAMES[s.targetLang] ?? s.targetLang}]\n` +
    `  Original:    ${s.original}\n` +
    `  Translation: ${s.translated ?? '(pending)'}\n`
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPanel({ subtitles }) {
  if (subtitles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-4xl mb-4">📜</span>
        <p className="text-slate-500 text-sm">No history yet. Start recording to see translations here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
      {/* Export bar */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">{subtitles.length} entries</span>
        <button
          onClick={() => exportToTxt(subtitles)}
          className="flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-lg transition-all hover:bg-indigo-500/20"
        >
          📥 Export TXT
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-3">
        {[...subtitles].reverse().map(entry => (
          <div key={entry.id} className="glass rounded-xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 font-semibold">
                  {LANG_NAMES[entry.sourceLang] ?? entry.sourceLang}
                </span>
                <span className="text-slate-600 text-xs">→</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 font-semibold">
                  {LANG_NAMES[entry.targetLang] ?? entry.targetLang}
                </span>
              </div>
              <span className="text-xs text-slate-600">{formatTime(entry.timestamp)}</span>
            </div>
            <p className="text-slate-300 text-sm mb-1">{entry.original}</p>
            {entry.translated
              ? <p className="text-indigo-200 text-sm font-medium">→ {entry.translated}</p>
              : <div className="h-4 w-32 shimmer rounded" />
            }
          </div>
        ))}
      </div>
    </div>
  );
}
