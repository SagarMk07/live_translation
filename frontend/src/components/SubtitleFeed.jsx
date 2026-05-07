import { useEffect, useRef } from 'react';
import { LANG_NAMES } from '../constants/languages';

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function SubtitleEntry({ entry, isLatest, partialText }) {
  const langName = LANG_NAMES[entry.sourceLang] ?? entry.sourceLang?.toUpperCase() ?? '??';

  return (
    <div className={`rounded-xl p-4 transition-all duration-500 animate-slide-up ${isLatest ? 'subtitle-latest' : 'border border-white/5'}`}>
      {/* Top row: lang badge + timestamp */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
            {langName}
          </span>
          {entry.confidence < 0.9 && (
            <span className="text-xs text-amber-400/70">{Math.round(entry.confidence * 100)}%</span>
          )}
        </div>
        <span className="text-xs text-slate-600">{formatTime(entry.timestamp)}</span>
      </div>

      {/* Original text */}
      <p className={`text-sm font-medium mb-1 ${isLatest ? 'text-white' : 'text-slate-400'}`}>
        {entry.original}
        {isLatest && partialText && (
          <span className="text-slate-500 italic ml-1">{partialText}<span className="animate-blink">|</span></span>
        )}
      </p>

      {/* Translated text */}
      {entry.translated ? (
        <p className={`text-base font-semibold ${isLatest ? 'text-indigo-200' : 'text-slate-300'}`}>
          → {entry.translated}
        </p>
      ) : (
        <div className="h-5 w-48 shimmer rounded mt-1" />
      )}
    </div>
  );
}

export default function SubtitleFeed({ subtitles, partialTranscript, isRecording }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [subtitles, partialTranscript]);

  const isEmpty = subtitles.length === 0 && !partialTranscript;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-1 space-y-3 py-2">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center border-2 transition-all duration-500 ${isRecording ? 'border-red-500 animate-glow glow-red' : 'border-indigo-500/30'}`}>
              <span className="text-3xl">{isRecording ? '🎙' : '🌐'}</span>
            </div>
            <p className="text-slate-500 text-sm">
              {isRecording
                ? 'Listening… start speaking in any language'
                : 'Click Start Recording and speak in any language'}
            </p>
          </div>
        )}

        {/* Partial transcript (live, before final) */}
        {partialTranscript && subtitles.length === 0 && (
          <div className="rounded-xl p-4 border border-indigo-500/20 bg-indigo-500/5">
            <p className="text-slate-400 italic text-sm">
              {partialTranscript}<span className="animate-blink">|</span>
            </p>
          </div>
        )}

        {subtitles.map((entry, i) => (
          <SubtitleEntry
            key={entry.id}
            entry={entry}
            isLatest={i === subtitles.length - 1}
            partialText={i === subtitles.length - 1 ? partialTranscript : ''}
          />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
