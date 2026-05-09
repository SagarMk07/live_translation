import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.asr import DeepgramASR
from services.translator import translate_text
from services.tts import generate_audio

router = APIRouter()


async def process_translation_tts(
    text: str,
    target_lang: str,
    source_lang: str,
    detected_lang: str,
    confidence: float,
    voice_id: str | None,
    gender: str,
    rate: str,
    websocket: WebSocket,
):
    """Translate text and send TTS audio back to client."""
    text = text.strip()
    if not text:
        return
    try:
        translated = await translate_text(text, target_lang, source_lang)
        if not translated:
            await websocket.send_json({"type": "translation", "text": f"[{text}]"})
            return

        await websocket.send_json({
            "type": "translation",
            "text": translated,
            "detected_lang": detected_lang,
            "confidence": round(confidence, 2),
        })

        print(f"[WS] TRANSLATION emit: '{translated}'")

        audio = await generate_audio(translated, target_lang, voice_id, gender, rate)
        if audio:
            await websocket.send_bytes(audio)
            print("[WS] TTS audio emit")

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

    # Session config
    target_lang   = "es"
    source_lang   = "auto"
    voice_id      = None
    gender        = "male"
    rate          = "+0%"
    last_final    = ""

    # ── ASR callbacks ─────────────────────────────────────────────────────────
    async def on_partial(text: str, detected_lang: str = "en", confidence: float = 1.0):
        print(f"[WS] PARTIAL emit: '{text}' | detected={detected_lang} ({confidence:.2f})")
        await websocket.send_json({
            "type": "partial",
            "text": text,
            "detected_lang": detected_lang,
            "confidence": round(confidence, 2),
        })

    async def on_final(text: str, detected_lang: str = "en", confidence: float = 1.0):
        nonlocal last_final
        if text == last_final:
            return
        last_final = text
        print(f"[WS] FINAL: '{text}' | detected={detected_lang} ({confidence:.2f})")

        await websocket.send_json({
            "type": "final",
            "text": text,
            "detected_lang": detected_lang,
            "confidence": round(confidence, 2),
        })

        asyncio.create_task(
            process_translation_tts(
                text, target_lang, source_lang,
                detected_lang, confidence,
                voice_id, gender, rate, websocket
            )
        )

    # ── Boot Deepgram ─────────────────────────────────────────────────────────
    asr = DeepgramASR(partial_callback=on_partial, final_callback=on_final)
    try:
        await asr.connect()
        await asyncio.sleep(0.1)
    except Exception as e:
        print(f"[WS] Deepgram unavailable: {e}")

    # ── Main receive loop ─────────────────────────────────────────────────────
    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                print("[WS] Clean disconnect")
                break

            # Binary → PCM audio from AudioWorklet → Deepgram
            if message.get("bytes") is not None:
                await asr.send_audio(message["bytes"])
                await asyncio.sleep(0.001)

            elif message.get("text") is not None:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type")

                # ── Config update ──────────────────────────────────────────
                if msg_type == "config":
                    target_lang = data.get("target_lang", target_lang)
                    source_lang = data.get("source_lang", "auto")
                    voice_id    = data.get("voice_id", None)
                    gender      = data.get("gender", "male")
                    speed_val   = float(data.get("speed", 1.0))
                    # Convert 0.5–2.0 speed to edge-tts rate string
                    pct = round((speed_val - 1.0) * 100)
                    rate = f"+{pct}%" if pct >= 0 else f"{pct}%"
                    last_final = ""   # reset dedup on language switch
                    print(f"[CONFIG] target={target_lang} source={source_lang} voice={voice_id} gender={gender} rate={rate}")

                # ── Typed text translation ────────────────────────────────
                elif msg_type == "text_translate":
                    text = data.get("text", "").strip()
                    req_id = data.get("id", "")
                    if text:
                        asyncio.create_task(
                            _handle_text_translate(
                                text, target_lang, source_lang,
                                voice_id, gender, rate, req_id, websocket
                            )
                        )

    except WebSocketDisconnect:
        print("[WS] Disconnect exception")
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
        import traceback; traceback.print_exc()
    finally:
        await asr.finish()
        print("[WS] Connection closed")


async def _handle_text_translate(
    text: str, target_lang: str, source_lang: str,
    voice_id: str | None, gender: str, rate: str,
    req_id: str, websocket: WebSocket
):
    """Handle typed text translation request over WebSocket."""
    import base64
    try:
        print(f"[TEXT_TRANSLATE] Request id={req_id} target={target_lang} gender={gender} rate={rate}")
        translated = await translate_text(text, target_lang, source_lang)
        print(f"[TEXT_TRANSLATE] Translation id={req_id}: '{translated}'")
        audio = await generate_audio(translated, target_lang, voice_id, gender, rate)
        audio_b64 = base64.b64encode(audio).decode() if audio else None
        print(f"[TEXT_TRANSLATE] TTS id={req_id}: {len(audio) if audio else 0} bytes")
        await websocket.send_json({
            "type": "text_translation_result",
            "id": req_id,
            "original": text,
            "translation": translated,
            "translated": translated,
            "audio": audio_b64,
            "audio_base64": audio_b64,
            "audio_mime": "audio/mpeg",
        })
    except Exception as e:
        print(f"[TEXT_TRANSLATE] Error: {e}")
        try:
            await websocket.send_json({
                "type": "text_translation_result",
                "id": req_id,
                "error": str(e),
            })
        except Exception:
            pass
