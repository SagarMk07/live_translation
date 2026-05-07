import { LANGUAGES, SOURCE_LANGUAGES } from '../constants/languages';

const VOICES_BY_LANG = {
  male:   'Male Voice',
  female: 'Female Voice',
};

function Select({ label, value, onChange, options, disabled }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-white/5 border border-white/8 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all disabled:opacity-40 cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt.code ?? opt.value} value={opt.code ?? opt.value} className="bg-[#0f1123]">
            {opt.flag ? `${opt.flag} ${opt.name}` : opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ControlPanel({
  isConnected, isRecording,
  sourceLang, setSourceLang,
  targetLang, setTargetLang,
  gender, setGender,
  speed, setSpeed,
  speechEnabled, setSpeechEnabled,
  detectedLang,
  onStartRecording, onStopRecording,
}) {
  const speedLabel = speed === 1 ? 'Normal' : speed < 1 ? `${Math.round((1 - speed) * 100)}% slower` : `${Math.round((speed - 1) * 100)}% faster`;

  return (
    <aside className="flex flex-col gap-5 w-full">

      {/* Detected language badge */}
      {detectedLang && (
        <div className="glass rounded-xl px-4 py-3 border border-emerald-500/20 animate-fade-in">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest font-semibold">Detected</p>
          <div className="flex items-center justify-between">
            <span className="text-emerald-300 font-semibold text-sm">
              {SOURCE_LANGUAGES.find(l => l.code === detectedLang.code)?.name ?? detectedLang.code}
            </span>
            <span className="text-xs text-slate-500">
              {Math.round(detectedLang.confidence * 100)}% confident
            </span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${Math.round(detectedLang.confidence * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Source language */}
      <Select
        label="Source Language"
        value={sourceLang}
        onChange={setSourceLang}
        options={SOURCE_LANGUAGES}
        disabled={!isConnected}
      />

      {/* Target language */}
      <Select
        label="Translate To"
        value={targetLang}
        onChange={setTargetLang}
        options={LANGUAGES}
        disabled={!isConnected}
      />

      {/* Voice gender */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Voice</label>
        <div className="grid grid-cols-2 gap-2">
          {['male', 'female'].map(g => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`py-2 rounded-lg text-sm font-medium border transition-all capitalize
                ${gender === g
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-white/4 border-white/8 text-slate-500 hover:border-white/15 hover:text-slate-300'
                }`}
            >
              {g === 'male' ? '👨 Male' : '👩 Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Speed */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Speed</label>
          <span className="text-xs text-slate-400">{speedLabel}</span>
        </div>
        <input
          type="range"
          min="0.5" max="1.5" step="0.1"
          value={speed}
          onChange={e => setSpeed(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-600">
          <span>0.5×</span><span>1×</span><span>1.5×</span>
        </div>
      </div>

      {/* Speaker toggle */}
      <button
        onClick={() => setSpeechEnabled(v => !v)}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all
          ${speechEnabled
            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
            : 'bg-white/4 border-white/8 text-slate-500 hover:border-white/15'
          }`}
      >
        {speechEnabled ? '🔊 Audio On' : '🔇 Audio Off'}
      </button>

      {/* Record button */}
      <div className="relative flex justify-center pt-2">
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20 pointer-events-none" />
            <span className="absolute inset-0 rounded-full animate-ping bg-red-500/10 pointer-events-none" style={{ animationDelay: '0.5s' }} />
          </>
        )}
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={!isConnected}
          className={`relative w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed
            ${isRecording
              ? 'bg-red-500/15 border-2 border-red-500/50 text-red-400 hover:bg-red-500/25 glow-red'
              : 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:from-indigo-500 hover:to-cyan-400 glow-indigo shadow-lg'
            }`}
        >
          {isRecording ? '⏹ Stop Recording' : '🎙 Start Recording'}
        </button>
      </div>
    </aside>
  );
}
