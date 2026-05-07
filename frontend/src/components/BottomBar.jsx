import { useRef, useEffect } from 'react';
import WaveformVisualizer from './WaveformVisualizer';

export default function BottomBar({
  isConnected, isRecording, volumeLevel, getAnalyserData,
  onStartRecording, onStopRecording,
  inputText, setInputText, onTranslateText, isTranslating,
}) {
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim()) onTranslateText();
    }
  };

  return (
    <div className="shrink-0 border-t border-white/6 glass-strong px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-4">

        {/* ── Mic button ── */}
        <div className="relative flex-shrink-0">
          {/* Pulse rings when recording */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDelay: '0.4s' }} />
            </>
          )}
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={!isConnected}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed
              ${isRecording
                ? 'bg-red-500 shadow-lg shadow-red-500/40 scale-110 hover:bg-red-400'
                : 'bg-gradient-to-br from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/30 hover:scale-105 hover:shadow-indigo-500/50'
              }`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? '⏹' : '🎙'}
          </button>
        </div>

        {/* ── Waveform ── */}
        <div className={`flex-shrink-0 w-32 transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-30'}`}>
          <WaveformVisualizer
            getAnalyserData={getAnalyserData}
            isActive={isRecording}
            height={40}
          />
        </div>

        {/* ── Status label ── */}
        <div className="w-28 flex-shrink-0 hidden sm:block">
          {isRecording ? (
            <div className="text-xs text-red-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording
            </div>
          ) : (
            <div className="text-xs text-slate-600">
              {isConnected ? 'Click mic to start' : 'Connecting…'}
            </div>
          )}
          <div className="text-xs text-slate-700 mt-0.5">
            {isRecording ? `Vol: ${Math.round(volumeLevel * 100)}%` : 'Any language'}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-8 w-px bg-white/8 hidden sm:block" />

        {/* ── Text input ── */}
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-4 py-2 focus-within:border-indigo-500/40 transition-all">
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Or type text to translate… (Enter)"
            disabled={!isConnected}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none disabled:opacity-40"
          />
          {inputText && (
            <button
              onClick={() => setInputText('')}
              className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
            >✕</button>
          )}
        </div>

        {/* ── Translate button ── */}
        <button
          onClick={onTranslateText}
          disabled={!isConnected || !inputText.trim() || isTranslating}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-sm font-semibold hover:from-indigo-500 hover:to-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
        >
          {isTranslating ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            '✨'
          )}
          <span className="hidden sm:inline">Translate</span>
        </button>
      </div>
    </div>
  );
}
