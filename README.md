# Real-Time Multilingual Classroom Translator

A low-latency classroom translation app built with FastAPI, WebSockets, React, and Vite. It accepts speech or typed text, translates it into supported target languages, and can return translated speech audio.

## Features

| Feature | Details |
|---|---|
| Live transcription | Streams microphone audio to the backend over WebSockets. |
| Translation | Uses OpenAI for multilingual translation. |
| Speech output | Uses Microsoft Edge TTS voices for generated audio. |
| Typed translation | REST endpoint for text input, translation, voice selection, and optional audio. |
| Classroom notes | Generates structured notes from a transcript, with a fallback when OpenAI is unavailable. |
| Session UI | React interface with conversation history, controls, language selection, and audio playback. |

## Project Structure

```text
Multilingual/
|-- .env.example
|-- backend/
|   |-- main.py
|   |-- websocket.py
|   |-- requirements.txt
|   |-- services/
|   |   |-- asr.py
|   |   |-- translator.py
|   |   `-- tts.py
|   |-- routes/
|   `-- utils/
`-- frontend/
    |-- package.json
    |-- vite.config.js
    |-- public/
    `-- src/
        |-- App.jsx
        |-- App.css
        |-- components/
        |-- hooks/
        `-- constants/
```

## Requirements

- Python 3.10 or newer. This project has been run with Python 3.14 through `uv`.
- Node.js 18 or newer.
- OpenAI API key.
- Deepgram API key if you enable live ASR.

## Environment

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

The app has fallback behavior for some AI features, but full translation, notes, and ASR require valid keys.

## Backend Setup

### Option A: Standard Python

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Option B: uv on Windows

Use this if the normal `python` command is unavailable or points to the Microsoft Store alias.

```powershell
$env:UV_CACHE_DIR="E:\Multilingual\.uv-cache"
uv venv --python 3.14 .venv
uv pip install -r backend\requirements.txt --python .venv\Scripts\python.exe
cd backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Backend URLs:

- API docs: `http://127.0.0.1:8000/docs`
- WebSocket: `ws://127.0.0.1:8000/ws`

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Frontend URL:

- App: `http://127.0.0.1:5173`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/translate` | Translate typed text and optionally return TTS audio as base64. |
| `GET` | `/api/voices/{lang}` | Return available TTS voices for a language. |
| `GET` | `/api/languages` | Return supported language codes and names. |
| `POST` | `/api/notes` | Generate structured classroom notes from transcript text. |
| `WS` | `/ws` | Stream audio chunks and receive transcription, translation, and audio frames. |

## WebSocket Protocol

Client to server:

| Frame Type | Payload | Purpose |
|---|---|---|
| Binary | PCM16 audio, 16 kHz, mono | Microphone audio chunk. |
| Text JSON | `{"type":"config","target_lang":"es"}` | Set or change the target language. |

Server to client:

| Frame Type | Payload | Description |
|---|---|---|
| Text JSON | `{"type":"partial","text":"..."}` | In-progress transcript. |
| Text JSON | `{"type":"final","text":"..."}` | Final transcript segment. |
| Text JSON | `{"type":"translation","text":"..."}` | Translated text. |
| Binary | MP3 bytes | TTS audio for the translation. |

## Supported Languages

| Language | Code | Example TTS voice |
|---|---|---|
| Spanish | `es` | `es-ES-AlvaroNeural` |
| French | `fr` | `fr-FR-HenriNeural` |
| German | `de` | `de-DE-KillianNeural` |
| Hindi | `hi` | `hi-IN-MadhurNeural` |
| Chinese | `zh` | `zh-CN-YunxiNeural` |
| Japanese | `ja` | `ja-JP-KeitaNeural` |
| Arabic | `ar` | `ar-SA-HamedNeural` |
| Portuguese | `pt` | `pt-BR-AntonioNeural` |
| Russian | `ru` | `ru-RU-DmitryNeural` |
| Korean | `ko` | `ko-KR-InJoonNeural` |
| Italian | `it` | `it-IT-DiegoNeural` |

## Notes For Development

- `deepgram-sdk` is pinned to `3.5.0` because the backend imports `LiveOptions` and `LiveTranscriptionEvents`, which are not compatible with the latest Deepgram SDK API.
- Keep `.env` out of Git. It is already covered by `.gitignore`.
- CORS is currently open for local development. Restrict `allow_origins` before deploying.
- Do not commit generated files such as `__pycache__`, `.venv`, `node_modules`, or local log files.

## Useful Commands

```powershell
# Build frontend
cd frontend
npm run build

# Run frontend lint
cd frontend
npm run lint

# Start backend from repo root
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

## License

MIT
