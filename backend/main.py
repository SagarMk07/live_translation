import base64
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import AsyncOpenAI
from websocket import router as websocket_router
from services.translator import translate_text, LANG_NAMES
from services.tts import generate_audio, get_voices_for_lang

load_dotenv()

app = FastAPI(title="LinguaAI — Multilingual Classroom Translator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket_router)


# ── REST: Typed translation ───────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "es"
    source_lang: str = "auto"
    voice_id: str | None = None
    gender: str = "male"
    speed: float = 1.0
    include_audio: bool = True


@app.post("/api/translate")
async def translate_endpoint(req: TranslateRequest):
    translated = await translate_text(req.text, req.target_lang, req.source_lang)
    audio_b64 = None
    if req.include_audio and translated:
        pct = round((req.speed - 1.0) * 100)
        rate = f"+{pct}%" if pct >= 0 else f"{pct}%"
        audio = await generate_audio(translated, req.target_lang, req.voice_id, req.gender, rate)
        if audio:
            audio_b64 = base64.b64encode(audio).decode()
    return {
        "original": req.text,
        "translated": translated,
        "source_lang": req.source_lang,
        "target_lang": req.target_lang,
        "audio": audio_b64,
    }


@app.get("/api/voices/{lang}")
async def voices_endpoint(lang: str):
    return {"lang": lang, "voices": get_voices_for_lang(lang)}


@app.get("/api/languages")
async def languages_endpoint():
    langs = [{"code": k, "name": v} for k, v in LANG_NAMES.items() if k != "auto"]
    return {"languages": langs}


# ── REST: Classroom notes generation ─────────────────────────────────────────

class NotesRequest(BaseModel):
    transcript: str
    title: str = "Lecture Notes"


@app.post("/api/notes")
async def generate_notes(req: NotesRequest):
    """Generate structured classroom notes from a multilingual transcript using GPT."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        # Fallback: simple extraction without AI
        lines = [l.strip() for l in req.transcript.split('\n') if l.strip() and not l.startswith('→')]
        notes = "## Key Points\n\n" + '\n'.join(f"• {l}" for l in lines[:20])
        return {"notes": notes, "model": "fallback"}

    try:
        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an intelligent classroom assistant that generates structured lecture notes "
                        "from multilingual transcripts. Extract key concepts, organize them into clear sections, "
                        "and provide actionable summary bullets. Format using markdown with ## headers, "
                        "bullet points (•), and **bold** for key terms. Be concise but comprehensive."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Generate structured classroom notes from this translated lecture transcript.\n\n"
                        f"Title: {req.title}\n\n"
                        f"Transcript:\n{req.transcript[:4000]}\n\n"
                        f"Format the output as:\n"
                        f"## 📋 Summary\n(2-3 sentence overview)\n\n"
                        f"## 🎯 Key Topics\n(bullet points)\n\n"
                        f"## 💡 Important Concepts\n(detailed explanations)\n\n"
                        f"## 📝 Action Items / Study Points\n(what to remember)"
                    ),
                },
            ],
            max_tokens=1000,
            temperature=0.3,
        )
        notes = response.choices[0].message.content.strip()
        return {"notes": notes, "model": "gpt-4o-mini"}
    except Exception as e:
        print(f"[NOTES] OpenAI error: {e}")
        # Graceful fallback
        lines = [l.strip() for l in req.transcript.split('\n') if l.strip() and not l.startswith('→')]
        notes = f"## Summary\n\nTranscript with {len(lines)} segments.\n\n## Key Points\n\n" + \
                '\n'.join(f"• {l}" for l in lines[:15])
        return {"notes": notes, "model": "fallback", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
