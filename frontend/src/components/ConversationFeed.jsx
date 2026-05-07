import { useEffect, useRef } from 'react';
import ConversationCard from './ConversationCard';

export default function ConversationFeed({ subtitles, partialTranscript, isRecording, aiStatus }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [subtitles, partialTranscript]);

  const isEmpty = subtitles.length === 0 && !partialTranscript;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center select-none">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 text-4xl transition-all duration-500 border-2
              ${isRecording
                ? 'border-red-500/50 bg-red-500/10 shadow-lg shadow-red-500/20'
                : 'border-indigo-500/20 bg-indigo-500/5'
              }`}>
              {isRecording ? '🎙' : '🌐'}
            </div>
            <h3 className="text-slate-400 font-semibold mb-2">
              {isRecording ? 'Listening for speech…' : 'No conversation yet'}
            </h3>
            <p className="text-slate-600 text-sm max-w-xs">
              {isRecording
                ? 'Speak in any language. AI will detect and translate automatically.'
                : 'Click the mic button and speak in any language to start translating.'}
            </p>

            {!isRecording && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['🇮🇳 Hindi', '🇪🇸 Spanish', '🇫🇷 French', '🇨🇳 Chinese', '🇯🇵 Japanese', '🇩🇪 German'].map(lang => (
                  <span key={lang} className="text-xs px-3 py-1 rounded-full border border-white/8 text-slate-500 bg-white/3">
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversation cards */}
        {subtitles.map((entry, i) => (
          <ConversationCard
            key={entry.id}
            entry={entry}
            isLatest={i === subtitles.length - 1}
          />
        ))}

        {/* Live partial transcript card */}
        {partialTranscript && (
          <div className="rounded-2xl px-4 py-3 border border-dashed border-indigo-500/30 bg-indigo-500/5 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">Speaking…</span>
            </div>
            <p className="text-slate-300 text-sm italic">
              {partialTranscript}
              <span className="animate-blink ml-0.5 text-indigo-400 not-italic">|</span>
            </p>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
