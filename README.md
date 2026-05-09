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
- Two terminal windows: one for the backend and one for the frontend.

## Environment

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

The app has fallback behavior for some AI features, but full translation, notes, TTS, and ASR require valid keys and network access.

## Quick Start

Run the backend and frontend in separate terminals.

## How To Run The Project

### Step 1: Open the project folder

```powershell
cd E:\Multilingual
```

### Step 2: Create the backend environment

Run this once:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
```

If `python` does not work on Windows, use the `uv` setup section below.

### Step 3: Run the backend

Open Terminal 1:

```powershell
cd E:\Multilingual
.\.venv\Scripts\activate
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

WebSocket:

```text
ws://127.0.0.1:8000/ws
```

### Step 4: Install frontend dependencies

Run this once:

```powershell
cd E:\Multilingual\frontend
npm install
```

### Step 5: Run the frontend

Open Terminal 2:

```powershell
cd E:\Multilingual\frontend
npm run dev -- --host 127.0.0.1
```

Frontend runs at:

```text
http://127.0.0.1:5173
```

Open `http://127.0.0.1:5173` in your browser.

## Backend Setup With uv

Use this if the normal `python` command is unavailable or points to the Microsoft Store alias.

```powershell
# From the project root
$env:UV_CACHE_DIR="E:\Multilingual\.uv-cache"
uv venv --python 3.14 .venv
uv pip install -r backend\requirements.txt --python .venv\Scripts\python.exe
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

If you use a different checkout path, replace `E:\Multilingual` in `UV_CACHE_DIR` with your project path.

## Run Commands Summary

Backend from the project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Frontend from the project root:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1
```

Production frontend build:

```powershell
cd frontend
npm run build
```

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
- Typed translation uses the WebSocket `text_translate` message and receives translated text plus base64 MP3 audio for playback.
- Live voice translation receives binary MP3 audio frames over the same WebSocket.
- Keep `.env` out of Git. It is already covered by `.gitignore`.
- CORS is currently open for local development. Restrict `allow_origins` before deploying.
- Do not commit generated files such as `__pycache__`, `.venv`, `node_modules`, or local log files.

## Troubleshooting

### `python` opens Microsoft Store or fails on Windows

Use the `uv` setup shown above, or install Python from `python.org` and make sure it is on PATH.

### Frontend cannot connect to backend

Make sure the backend is running at `http://127.0.0.1:8000` and the WebSocket URL in `frontend/src/hooks/useAudioStream.js` points to `ws://localhost:8000/ws`.

### Backend says `Could not import module "main"`

You are running Uvicorn from the project root without telling it where `backend/main.py` is. Use this command from `E:\Multilingual`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Or run from inside the backend folder:

```powershell
cd E:\Multilingual\backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Backend says socket access is forbidden or port 8000 is busy

Check what is using port `8000`:

```powershell
netstat -ano | findstr :8000
```

Stop the process by PID:

```powershell
taskkill /PID <PID_FROM_NETSTAT> /F
```

Then start the backend again:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Typed translation works but audio does not play

Check that the Audio Playback toggle is on. Also check the browser console for `[TTS]` and `[AUDIO]` logs.

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
