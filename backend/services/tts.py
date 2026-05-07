import io
import edge_tts

VOICE_MAP = {
    "es": "es-ES-AlvaroNeural",
    "fr": "fr-FR-HenriNeural",
    "de": "de-DE-KillianNeural",
    "hi": "hi-IN-MadhurNeural",
    "zh": "zh-CN-YunxiNeural",
    "ja": "ja-JP-KeitaNeural",
    "ar": "ar-SA-HamedNeural",
    "pt": "pt-BR-AntonioNeural",
    "ru": "ru-RU-DmitryNeural",
    "ko": "ko-KR-InJoonNeural",
    "it": "it-IT-DiegoNeural",
    "en": "en-US-AndrewNeural",
}

DEFAULT_VOICE = "en-US-AndrewNeural"


async def generate_audio(text: str, target_lang: str) -> bytes | None:
    """Convert translated text to speech using edge-tts.

    Args:
        text: Text to speak.
        target_lang: BCP-47 language code used to pick a voice.

    Returns:
        MP3 bytes on success, None on failure.
    """
    if not text.strip():
        return None

    voice = VOICE_MAP.get(target_lang, DEFAULT_VOICE)
    print(f"TTS: '{text[:40]}...' lang={target_lang} voice={voice}")

    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
        result = audio_data.getvalue()
        if not result:
            print("TTS returned empty audio")
            return None
        print(f"TTS audio: {len(result)} bytes")
        return result
    except Exception as e:
        print(f"TTS error: {e}")
        return None
