import io
import edge_tts

# Male and female voice options per language
VOICES = {
    "ar": {"male": "ar-SA-HamedNeural",    "female": "ar-SA-ZariyahNeural"},
    "bn": {"male": "bn-BD-PradeepNeural",  "female": "bn-BD-NabanitaNeural"},
    "zh": {"male": "zh-CN-YunxiNeural",    "female": "zh-CN-XiaoxiaoNeural"},
    "zh-cn": {"male": "zh-CN-YunxiNeural", "female": "zh-CN-XiaoxiaoNeural"},
    "zh-tw": {"male": "zh-TW-YunJheNeural","female": "zh-TW-HsiaoChenNeural"},
    "cs": {"male": "cs-CZ-AntoninNeural",  "female": "cs-CZ-VlastaNeural"},
    "da": {"male": "da-DK-JeppeNeural",    "female": "da-DK-ChristelNeural"},
    "nl": {"male": "nl-NL-MaartenNeural",  "female": "nl-NL-ColetteNeural"},
    "en": {"male": "en-US-AndrewNeural",   "female": "en-US-JennyNeural"},
    "fi": {"male": "fi-FI-HarriNeural",    "female": "fi-FI-NooraNeural"},
    "fr": {"male": "fr-FR-HenriNeural",    "female": "fr-FR-DeniseNeural"},
    "de": {"male": "de-DE-KillianNeural",  "female": "de-DE-KatjaNeural"},
    "el": {"male": "el-GR-NestorasNeural", "female": "el-GR-AthinaNeural"},
    "gu": {"male": "gu-IN-NiranjanNeural", "female": "gu-IN-DhwaniNeural"},
    "hi": {"male": "hi-IN-MadhurNeural",   "female": "hi-IN-SwaraNeural"},
    "hu": {"male": "hu-HU-TamasNeural",    "female": "hu-HU-NoemiNeural"},
    "id": {"male": "id-ID-ArdiNeural",     "female": "id-ID-GadisNeural"},
    "it": {"male": "it-IT-DiegoNeural",    "female": "it-IT-ElsaNeural"},
    "ja": {"male": "ja-JP-KeitaNeural",    "female": "ja-JP-NanamiNeural"},
    "kn": {"male": "kn-IN-GaganNeural",    "female": "kn-IN-SapnaNeural"},
    "ko": {"male": "ko-KR-InJoonNeural",   "female": "ko-KR-SunHiNeural"},
    "ml": {"male": "ml-IN-MidhunNeural",   "female": "ml-IN-SobhanaNeural"},
    "mr": {"male": "mr-IN-ManoharNeural",  "female": "mr-IN-AarohiNeural"},
    "no": {"male": "nb-NO-FinnNeural",     "female": "nb-NO-PernilleNeural"},
    "fa": {"male": "fa-IR-FaridNeural",    "female": "fa-IR-DilaraNeural"},
    "pl": {"male": "pl-PL-MarekNeural",    "female": "pl-PL-ZofiaNeural"},
    "pt": {"male": "pt-BR-AntonioNeural",  "female": "pt-BR-FranciscaNeural"},
    "pa": {"male": "pa-IN-OjasNeural",     "female": "pa-IN-VaaniNeural"},
    "ro": {"male": "ro-RO-EmilNeural",     "female": "ro-RO-AlinaNeural"},
    "ru": {"male": "ru-RU-DmitryNeural",   "female": "ru-RU-SvetlanaNeural"},
    "es": {"male": "es-ES-AlvaroNeural",   "female": "es-ES-ElviraNeural"},
    "sv": {"male": "sv-SE-MattiasNeural",  "female": "sv-SE-SofieNeural"},
    "ta": {"male": "ta-IN-ValluvarNeural", "female": "ta-IN-PallaviNeural"},
    "te": {"male": "te-IN-MohanNeural",    "female": "te-IN-ShrutiNeural"},
    "th": {"male": "th-TH-NiwatNeural",    "female": "th-TH-PremwadeeNeural"},
    "tr": {"male": "tr-TR-AhmetNeural",    "female": "tr-TR-EmelNeural"},
    "uk": {"male": "uk-UA-OstapNeural",    "female": "uk-UA-PolinaNeural"},
    "ur": {"male": "ur-PK-AsadNeural",     "female": "ur-PK-UzmaNeural"},
    "vi": {"male": "vi-VN-NamMinhNeural",  "female": "vi-VN-HoaiMyNeural"},
}

DEFAULT_VOICE = "en-US-AndrewNeural"


def get_voice(target_lang: str, gender: str = "male", voice_id: str = None) -> str:
    """Resolve the voice to use for TTS."""
    if voice_id:
        return voice_id
    lang_voices = VOICES.get(target_lang)
    if lang_voices:
        return lang_voices.get(gender, lang_voices["male"])
    return DEFAULT_VOICE


def get_voices_for_lang(target_lang: str) -> list[dict]:
    """Return list of available voices for a language."""
    lang_voices = VOICES.get(target_lang)
    if not lang_voices:
        return [{"id": DEFAULT_VOICE, "gender": "male", "label": "Default"}]
    return [
        {"id": lang_voices["male"],   "gender": "male",   "label": "Male"},
        {"id": lang_voices["female"], "gender": "female", "label": "Female"},
    ]


async def generate_audio(
    text: str,
    target_lang: str,
    voice_id: str = None,
    gender: str = "male",
    rate: str = "+0%",
) -> bytes | None:
    """Convert text to speech using edge-tts.

    Args:
        text: Text to speak.
        target_lang: BCP-47 language code.
        voice_id: Specific voice ID (overrides gender selection).
        gender: 'male' or 'female'.
        rate: Speech rate, e.g. '+0%', '+20%', '-10%'.

    Returns:
        MP3 bytes on success, None on failure.
    """
    if not text.strip():
        return None

    voice = get_voice(target_lang, gender, voice_id)
    print(f"[TTS] '{text[:40]}' | lang={target_lang} voice={voice} rate={rate}")

    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        audio_data = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
        result = audio_data.getvalue()
        if not result:
            print("[TTS] Returned empty audio")
            return None
        print(f"[TTS] Audio: {len(result)} bytes")
        return result
    except Exception as e:
        print(f"[TTS] Error: {e}")
        return None
