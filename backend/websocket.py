import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.asr import DeepgramASR
from services.translator import translate_text
from services.tts import generate_audio

router = APIRouter()


async def process_translation_tts(text: str, target_lang: str, websocket: WebSocket):
    """Translate text and send TTS audio back to client."""
    text = text.strip()
    if not text:
        return
    try:
        translated = await translate_text(text, target_lang)
        if not translated:
            await websocket.send_json({"type": "translation", "text": f"[{text}]"})
            return

        await websocket.send_json({"type": "translation", "text": translated})

        audio = await generate_audio(translated, target_lang)
        if audio:
            await websocket.send_bytes(audio)

    except Exception as e:
        print(f"[PIPELINE ERROR] {e}")
        try:
            await websocket.send_json({"type": "translation", "text": f"[{text}]"})
        except Exception:
            pass


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[WS] Client connected")

    target_lang = "es"
    last_final  = ""   # dedup guard

    # ── Callbacks fired by Deepgram ASR ──────────────────────────────────────
    async def on_partial(text: str):
        await websocket.send_json({"type": "partial", "text": text})

    async def on_final(text: str):
        nonlocal last_final
        if text == last_final:          # skip duplicate sentences
            return
        last_final = text
        print(f"FINAL TEXT: {text}")
        await websocket.send_json({"type": "final", "text": text})
        asyncio.create_task(
            process_translation_tts(text, target_lang, websocket)
        )

    # ── Boot Deepgram ─────────────────────────────────────────────────────────
    asr = DeepgramASR(partial_callback=on_partial, final_callback=on_final)
    try:
        await asr.connect()
        await asyncio.sleep(0.1)   # allow WebSocket handshake to stabilize
    except Exception as e:
        print(f"[WS] Deepgram unavailable: {e}")

    # ── Main receive loop ─────────────────────────────────────────────────────
    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                print("[WS] Clean disconnect")
                break

            # Binary → raw PCM from AudioContext → Deepgram
            if message.get("bytes") is not None:
                chunk = message["bytes"]
                print(f"Audio chunk received: {len(chunk)}")
                asr.send_audio(chunk)            # sync — no await
                await asyncio.sleep(0.001)       # yield loop so SDK callback fires

            # Text → config update only (ASR now handled by Deepgram)
            elif message.get("text") is not None:
                try:
                    data = json.loads(message["text"])
                    if data.get("type") == "config":
                        target_lang = data.get("target_lang", "es")
                        last_final  = ""   # reset dedup on language switch
                        print(f"[CONFIG] Language → {target_lang}")
                except json.JSONDecodeError:
                    pass

    except WebSocketDisconnect:
        print("[WS] Disconnect exception")
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
        import traceback; traceback.print_exc()
    finally:
        await asr.finish()
        print("[WS] Connection closed")