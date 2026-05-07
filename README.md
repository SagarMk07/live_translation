# 🌐 Real-Time Multilingual Classroom Translator

A production-quality, low-latency speech translation system built with **FastAPI + WebSockets** on the backend and **React + Vite** on the frontend. Speak in English — see live transcriptions and hear translated speech in 11 languages instantly.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎙 Live Transcription | Real-time English speech-to-text via Deepgram Nova-2 |
| 🌍 Instant Translation | English → 11 languages via OpenAI `gpt-4o-mini` |
| 🔊 Speech Output | Translated audio via Microsoft Edge TTS — queue-based, no overlap |
| 📡 WebSocket Streaming | Binary audio chunks + JSON messages over a single connection |
| 🟢 Status Indicator | Animated live connection pill (green pulse / red) |
| ✍️ Partial Transcripts | Faded italic text updates as you speak; snaps solid when final |
| 🎭 Slide-in Translations | Each new translation line animates in smoothly |
| 🔇 Speech Toggle | Disable audio output without breaking translation |
| 🗑 Clear Session | Reset transcript + translation history in one click |

---

## 🗂 Project Structure

```
Multilingual/
├── .env                        # API keys (never commit this!)
├── backend/
│   ├── main.py                 # FastAPI app + CORS + dotenv
│   ├── websocket.py            # WebSocket endpoint, connection state, pipeline
│   ├── services/
│   │   ├── asr.py              # Deepgram live-streaming ASR client
│   │   ├── translator.py       # OpenAI gpt-4o-mini translation (async)
│   │   └── tts.py              # Microsoft Edge TTS → MP3 bytes
│   └── utils/
│       ├── audio.py            # (reserved for audio utilities)
│       └── buffer.py           # (reserved for buffer utilities)
└── frontend/
    ├── src/
    │   ├── App.jsx             # Main UI — header, panels, record button
    │   ├── App.css             # Dark glassmorphism design system
    │   ├── index.css           # Inter font + base reset
    │   └── hooks/
    │       └── useAudioStream.js  # WebSocket + audio queue + recording hook
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🛠 Tech Stack

### Backend
- **FastAPI** — async Python web framework
- **WebSockets** — real-time bidirectional communication
- **Deepgram Nova-2** — streaming ASR (speech-to-text)
- **OpenAI gpt-4o-mini** — fast, accurate translation
- **edge-tts** — Microsoft Neural TTS voices, 11 languages
- **python-dotenv** — environment variable loading

### Frontend
- **React 19** — UI components
- **Vite 8** — lightning-fast dev server & build
- **Tailwind CSS v4** — utility styling
- **Web Audio API** — raw PCM microphone capture at 16 kHz
- **Audio Queue** — sequential blob playback, no overlap

---

## ⚙️ Setup

### Prerequisites
- Python 3.10+ (project uses 3.14)
- Node.js 18+
- API keys for Deepgram and OpenAI

### 1. Clone & Configure

```bash
git clone <your-repo-url>
cd Multilingual
```

Edit **`.env`** in the project root:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key
```

> **Deepgram key**: [console.deepgram.com](https://console.deepgram.com)  
> **OpenAI key**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

### 2. Backend Setup

**Windows (PowerShell):**
```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install all dependencies (single line — no backslash needed)
pip install fastapi "uvicorn[standard]" python-dotenv websockets openai edge-tts "deepgram-sdk==3.5.0"
```

**Mac / Linux (bash):**
```bash
python -m venv venv
source venv/bin/activate
pip install fastapi "uvicorn[standard]" python-dotenv websockets openai edge-tts "deepgram-sdk==3.5.0"
```

Start the backend:

```bash
uvicorn main:app --reload
# Running at http://localhost:8000
# WebSocket at ws://localhost:8000/ws
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Running at http://localhost:5173
```

---

## 🌍 Supported Languages

| Flag | Language | Code | TTS Voice |
|------|----------|------|-----------|
| 🇪🇸 | Spanish | `es` | es-ES-AlvaroNeural |
| 🇫🇷 | French | `fr` | fr-FR-HenriNeural |
| 🇩🇪 | German | `de` | de-DE-KillianNeural |
| 🇮🇳 | Hindi | `hi` | hi-IN-MadhurNeural |
| 🇨🇳 | Chinese | `zh` | zh-CN-YunxiNeural |
| 🇯🇵 | Japanese | `ja` | ja-JP-KeitaNeural |
| 🇸🇦 | Arabic | `ar` | ar-SA-HamedNeural |
| 🇧🇷 | Portuguese | `pt` | pt-BR-AntonioNeural |
| 🇷🇺 | Russian | `ru` | ru-RU-DmitryNeural |
| 🇰🇷 | Korean | `ko` | ko-KR-InJoonNeural |
| 🇮🇹 | Italian | `it` | it-IT-DiegoNeural |

---

## 🔌 WebSocket Protocol

All communication happens over a single WebSocket at `ws://localhost:8000/ws`.

### Client → Server

| Frame Type | Payload | Purpose |
|---|---|---|
| Binary | Raw PCM16, 16 kHz, mono | Audio chunk from microphone |
| Text JSON | `{"type": "config", "target_lang": "es"}` | Set/change translation language |

### Server → Client

| Frame Type | JSON / Binary | Description |
|---|---|---|
| Text | `{"type": "partial", "text": "..."}` | Live in-progress transcript |
| Text | `{"type": "final", "text": "..."}` | Completed sentence transcript |
| Text | `{"type": "translation", "text": "..."}` | Translated sentence |
| Binary | MP3 bytes | TTS audio for the translation |

---

## 🏗 Architecture

```
Microphone (16 kHz PCM)
        │
        ▼
  WebSocket /ws
        │
   ┌────▼─────────────┐
   │  ConnectionState  │  target_lang, asr_started, last_final
   └────┬─────────────┘
        │
   ┌────▼──────┐    ┌────────────┐    ┌───────────┐
   │  Deepgram │───▶│  OpenAI    │───▶│  Edge TTS │
   │  ASR      │    │  gpt-4o    │    │  (MP3)    │
   └───────────┘    └────────────┘    └─────┬─────┘
                                            │
                              Binary WebSocket frame
                                            │
                                     Audio Queue
                                     (sequential
                                      playback)
```

---

## 🐛 Known Issues & Current State

| Status | Issue |
|---|---|
| ⚠️ Disabled | Deepgram ASR is temporarily bypassed — fake ASR runs once per session |
| ✅ Fixed | `google.generativeai` replaced with OpenAI (was deprecated, no ADC) |
| ✅ Fixed | WebSocket disconnect crash (`receive after disconnect`) |
| ✅ Fixed | Duplicate transcript spam (dedup via `last_final` guard) |
| ✅ Fixed | Target language race condition (snapshot at task-start) |

To re-enable Deepgram, uncomment the ASR init block in `websocket.py` once the integration is stable.

---

## 🔒 Security Notes

- **Never commit `.env`** — it contains secret API keys
- `.env` is listed in `.gitignore` (verify this before pushing)
- CORS is set to `allow_origins=["*"]` for development — restrict in production

---

## 📄 License

MIT — free to use, modify, and distribute.
