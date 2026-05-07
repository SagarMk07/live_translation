import base64
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from websocket import router as websocket_router
from services.translator import translate_text, LANG_NAMES
from services.tts import generate_audio, get_voices_for_lang

load_dotenv()

app = FastAPI(title="Multilingual AI Translator")

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
    """Translate typed text and optionally return TTS audio as base64."""
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
    """Return available TTS voices for a language."""
    return {"lang": lang, "voices": get_voices_for_lang(lang)}


@app.get("/api/languages")
async def languages_endpoint():
    """Return supported language list."""
    langs = [
        {"code": k, "name": v}
        for k, v in LANG_NAMES.items()
        if k != "auto"
    ]
    return {"languages": langs}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
