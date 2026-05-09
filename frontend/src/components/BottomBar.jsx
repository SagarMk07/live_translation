import { useEffect, useRef } from 'react';

export default function BottomBar({
  isConnected,
  isRecording,
  speechEnabled,
  setSpeechEnabled,
  onStartRecording,
  onStopRecording,
  inputText,
  setInputText,
  onTranslateText,
  isTranslating,
  textMode,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textMode) textareaRef.current?.focus();
  }, [textMode]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onTranslateText();
    }
  };

  return (
    <div className="input-dock">
      <div className="input-shell">
        <button
          className={`dock-icon mic ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={!isConnected}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          type="button"
        >
          <span />
        </button>

        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a phrase to translate, or use the mic for live speech..."
          disabled={!isConnected}
          rows={2}
        />

        <div className="dock-actions">
          <button
            className={`dock-icon playback ${speechEnabled ? 'active' : ''}`}
            onClick={() => setSpeechEnabled((value) => !value)}
            aria-label="Toggle playback"
            type="button"
          >
            <span />
          </button>
          <button
            className="translate-button"
            onClick={onTranslateText}
            disabled={!isConnected || !inputText.trim() || isTranslating}
            type="button"
          >
            {isTranslating ? <span className="spinner" /> : null}
            {isTranslating && textMode ? 'Generating speech' : 'Translate'}
          </button>
        </div>
      </div>
    </div>
  );
}
