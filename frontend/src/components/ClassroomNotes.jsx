import { useState } from 'react';

function printNotes(title, content) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; color: #1e293b; line-height: 1.7; }
    h1 { color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #7c3aed; margin-top: 28px; font-size: 1.1rem; }
    li { margin: 6px 0; }
    .meta { color: #94a3b8; font-size: 0.85rem; margin-bottom: 24px; }
    .transcript { background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 8px 0; border-radius: 4px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
${content}
<script>window.onload = () => window.print();</script>
</body>
</html>`);
  win.document.close();
}

export default function ClassroomNotes({ subtitles, isConnected }) {
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!subtitles.length) return;
    setLoading(true);
    setError('');
    try {
      const transcript = subtitles
        .map(s => `[${(s.sourceLang ?? 'en').toUpperCase()}] ${s.original}\n→ ${s.translated ?? '(pending)'}`)
        .join('\n\n');

      const res = await fetch('http://localhost:8000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, title: 'Lecture Notes' }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setNotes(data.notes);
      setGenerated(true);
    } catch (e) {
      setError(e.message || 'Failed to generate notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const date = new Date().toLocaleDateString();
    const content = `
      <h1>📚 Classroom Notes</h1>
      <p class="meta">Generated on ${date} · ${subtitles.length} segments translated</p>
      <h2>📝 AI-Generated Notes</h2>
      <div>${notes.replace(/\n/g, '<br>').replace(/##\s(.+)/g, '<h2>$1</h2>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</div>
      <h2>📜 Full Transcript</h2>
      ${subtitles.map(s =>
        `<div class="transcript"><strong>[${(s.sourceLang ?? '').toUpperCase()}]</strong> ${s.original}<br>→ <em>${s.translated ?? '(pending)'}</em></div>`
      ).join('')}
    `;
    printNotes('Classroom Notes', content);
  };

  if (subtitles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-4">📚</span>
        <p className="text-slate-500 text-sm">No lecture transcript yet.</p>
        <p className="text-slate-600 text-xs mt-1">Start recording a lecture to generate AI notes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shrink-0">
        <div>
          <h3 className="font-bold text-slate-200">🧠 Auto Classroom Notes</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitles.length} translated segments · AI summarization</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading || !isConnected}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
            ) : (
              <><span>✨</span> {generated ? 'Regenerate' : 'Generate Notes'}</>
            )}
          </button>
          {generated && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/30 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/10 transition-all"
            >
              📄 Download PDF
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {/* AI Notes */}
        {notes && (
          <div className="glass rounded-2xl p-5 border border-indigo-500/20 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-indigo-400 text-sm font-bold">✨ AI-Generated Notes</span>
              <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/30 to-transparent" />
            </div>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{notes}</div>
          </div>
        )}

        {/* Raw transcript */}
        <div className="glass rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-slate-400 text-sm font-bold">📜 Full Transcript</span>
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-slate-600">{subtitles.length} entries</span>
          </div>
          <div className="space-y-3">
            {subtitles.map((s, i) => (
              <div key={s.id ?? i} className="flex gap-3 text-sm">
                <span className="shrink-0 text-slate-600 tabular-nums text-xs mt-0.5">
                  {String(i + 1).padStart(2, '0')}.
                </span>
                <div>
                  <p className="text-slate-300">{s.original}</p>
                  {s.translated && (
                    <p className="text-indigo-300 mt-0.5">→ {s.translated}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
