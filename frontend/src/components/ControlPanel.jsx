import { LANGUAGES, SOURCE_LANGUAGES } from '../constants/languages';

function Field({ label, children }) {
  return (
    <label className="control-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options, disabled, ariaLabel }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.code ?? option.value} value={option.code ?? option.value}>
          {option.name}
        </option>
      ))}
    </select>
  );
}

export default function ControlPanel({
  isConnected,
  isRecording,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  gender,
  setGender,
  speed,
  setSpeed,
  speechEnabled,
  setSpeechEnabled,
  detectedLang,
  onStartRecording,
  onStopRecording,
  onExportHistory,
  hasHistory,
}) {
  const speedLabel = `${speed.toFixed(1)}x`;
  const detectedName = detectedLang
    ? SOURCE_LANGUAGES.find((language) => language.code === detectedLang.code)?.name ?? detectedLang.code
    : 'Waiting for speech';

  return (
    <div className="control-card">
      <div className="control-card-header">
        <div>
          <p>Session Controls</p>
          <span>Compact voice and translation setup</span>
        </div>
        <span className={`mini-status ${isConnected ? 'is-online' : ''}`} />
      </div>

      <div className="detected-card">
        <span>Detected language</span>
        <strong>{detectedName}</strong>
        {detectedLang && (
          <div className="confidence-track">
            <span style={{ width: `${Math.round((detectedLang.confidence ?? 1) * 100)}%` }} />
          </div>
        )}
      </div>

      <Field label="Source">
        <Select
          value={sourceLang}
          onChange={setSourceLang}
          options={SOURCE_LANGUAGES}
          disabled={!isConnected}
          ariaLabel="Source language"
        />
      </Field>

      <Field label="Target">
        <Select
          value={targetLang}
          onChange={setTargetLang}
          options={LANGUAGES}
          disabled={!isConnected}
          ariaLabel="Target language"
        />
      </Field>

      <Field label="Voice">
        <div className="segmented-control">
          {['male', 'female'].map((voice) => (
            <button
              key={voice}
              className={gender === voice ? 'active' : ''}
              onClick={() => setGender(voice)}
              type="button"
            >
              {voice}
            </button>
          ))}
        </div>
      </Field>

      <Field label={`Speed ${speedLabel}`}>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={speed}
          onChange={(event) => setSpeed(parseFloat(event.target.value))}
        />
      </Field>

      <button
        className={`control-toggle ${speechEnabled ? 'active' : ''}`}
        onClick={() => setSpeechEnabled((value) => !value)}
        type="button"
      >
        <span className="speaker-icon" />
        Audio playback
        <strong>{speechEnabled ? 'On' : 'Off'}</strong>
      </button>

      <button
        className={`record-button ${isRecording ? 'recording' : ''}`}
        onClick={isRecording ? onStopRecording : onStartRecording}
        disabled={!isConnected}
        type="button"
      >
        <span className="record-dot" />
        {isRecording ? 'Stop recording' : 'Start recording'}
      </button>

      <button
        className="export-button"
        onClick={onExportHistory}
        disabled={!hasHistory}
        type="button"
      >
        Export history
      </button>
    </div>
  );
}
