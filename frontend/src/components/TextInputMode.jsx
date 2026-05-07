import { useState, useRef } from 'react';
import { LANGUAGES, SOURCE_LANGUAGES } from '../constants/languages';

function LangSelect({ value, onChange, options, label, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 font-semibold uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="bg-white/5 border border-white/8 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50 transition-all disabled:opacity-40"
      >
        {options.map(l => (
          <option key={l.code} value={l.code} className="bg-[#0f1123]">
            {l.flag ? `${l.flag} ${l.name}` : l.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function TextInputMode({ isConnected, translateText }) {
  const [inputText, setInputText]     = useState('');
  const [sourceLang, setSourceLang]   = useState('auto');
  const [targetLang, setTargetLang]   = useState('es');
  const [gender, setGender]           = useState('male');
  const [result, setResult]           = useState(null);   // {translated, audio}
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const audioRef = useRef(null);

  const handleTranslate = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await translateText(inputText.trim());
      setResult(data);
    } catch (e) {
      setError(e.message || 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (!result?.audio) return;
    const bytes = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play();
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">

      {/* Language row */}
      <div className="grid grid-cols-2 gap-4">
        <LangSelect label="From" value={sourceLang} onChange={setSourceLang} options={SOURCE_LANGUAGES} disabled={!isConnected} />
        <LangSelect label="To"   value={targetLang} onChange={setTargetLang} options={LANGUAGES}        disabled={!isConnected} />
      </div>

      {/* Voice gender */}
      <div className="flex gap-2">
        {['male', 'female'].map(g => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all capitalize
              ${gender === g ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/4 border-white/8 text-slate-500 hover:text-slate-300'}`}
          >
            {g === 'male' ? '👨 Male' : '👩 Female'} Voice
          </button>
        ))}
      </div>

      {/* Input textarea */}
      <div className="glass rounded-2xl p-1 focus-within:border-indigo-500/30 transition-all">
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleTranslate(); }}
          placeholder="Type or paste text to translate… (Ctrl+Enter to translate)"
          rows={5}
          disabled={!isConnected}
          className="w-full bg-transparent text-slate-200 placeholder-slate-600 text-sm p-4 outline-none resize-none disabled:opacity-40"
        />
        <div className="flex justify-between items-center px-4 pb-3">
          <span className="text-xs text-slate-600">{inputText.length} chars</span>
          <button
            onClick={handleTranslate}
            disabled={!isConnected || !inputText.trim() || loading}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:from-indigo-500 hover:to-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed glow-indigo"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Translating…
              </>
            ) : (
              <>✨ Translate</>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-xl px-4 py-3 border border-red-500/20 text-red-400 text-sm animate-fade-in">
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {result?.translated && (
        <div className="glass rounded-2xl p-5 border border-indigo-500/20 animate-slide-up">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Translation</span>
            <div className="flex gap-2">
              {result.audio && (
                <button
                  onClick={handlePlayAudio}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg transition-all hover:bg-cyan-500/20"
                >
                  🔊 Play
                </button>
              )}
              <button
                onClick={() => navigator.clipboard.writeText(result.translated)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/5 border border-white/8 px-3 py-1.5 rounded-lg transition-all"
              >
                📋 Copy
              </button>
            </div>
          </div>
          <p className="text-indigo-200 text-base font-medium leading-relaxed">{result.translated}</p>
        </div>
      )}
    </div>
  );
}
