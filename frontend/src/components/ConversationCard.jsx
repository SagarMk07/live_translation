import { LANG_NAMES, LANGUAGES } from '../constants/languages';

const FLAG_MAP = Object.fromEntries(
  LANGUAGES.map(l => [l.code, l.flag])
);

function formatTime(date) {
  return date instanceof Date
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';
}

export default function ConversationCard({ entry, isLatest }) {
  const srcFlag  = FLAG_MAP[entry.sourceLang]  ?? '🌐';
  const tgtFlag  = FLAG_MAP[entry.targetLang]  ?? '🌐';
  const srcName  = LANG_NAMES[entry.sourceLang] ?? entry.sourceLang?.toUpperCase();
  const tgtName  = LANG_NAMES[entry.targetLang] ?? entry.targetLang?.toUpperCase();

  return (
    <div className={`rounded-2xl p-4 transition-all duration-500 animate-slide-up group
      ${isLatest
        ? 'border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 shadow-lg shadow-indigo-500/5'
        : 'border border-white/5 bg-white/[0.02] hover:border-white/10'
      }`}>

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        {/* Language badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/6 border border-white/8 text-xs font-semibold">
          <span>{srcFlag}</span>
          <span className="text-slate-400">{srcName}</span>
          <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{tgtFlag}</span>
          <span className="text-slate-400">{tgtName}</span>
        </div>

        <div className="flex items-center gap-2">
          {isLatest && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              live
            </span>
          )}
          <span className="text-xs text-slate-600">{formatTime(entry.timestamp)}</span>
        </div>
      </div>

      {/* Original text */}
      <p className={`text-sm leading-relaxed mb-3 ${isLatest ? 'text-white font-medium' : 'text-slate-300'}`}>
        {entry.original}
      </p>

      {/* Divider with arrow */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        <span className="text-indigo-400 text-xs">↓ translated</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </div>

      {/* Translated text */}
      {entry.translated ? (
        <p className={`text-base leading-relaxed font-semibold ${isLatest ? 'text-indigo-200' : 'text-slate-300'}`}>
          {entry.translated}
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400/50 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-slate-600">Translating…</span>
        </div>
      )}

      {/* Confidence bar (subtle) */}
      {entry.confidence < 0.95 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-0.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400/50 transition-all duration-700"
              style={{ width: `${Math.round(entry.confidence * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-600">{Math.round(entry.confidence * 100)}% confident</span>
        </div>
      )}
    </div>
  );
}
