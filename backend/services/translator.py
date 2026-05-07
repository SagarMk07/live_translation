import asyncio
from deep_translator import GoogleTranslator

LANG_NAMES = {
    "af": "Afrikaans", "ar": "Arabic", "bn": "Bengali",
    "zh": "Chinese", "zh-cn": "Chinese (Simplified)", "zh-tw": "Chinese (Traditional)",
    "cs": "Czech", "da": "Danish", "nl": "Dutch", "en": "English",
    "fi": "Finnish", "fr": "French", "de": "German", "el": "Greek",
    "gu": "Gujarati", "hi": "Hindi", "hu": "Hungarian", "id": "Indonesian",
    "it": "Italian", "ja": "Japanese", "kn": "Kannada", "ko": "Korean",
    "ml": "Malayalam", "mr": "Marathi", "no": "Norwegian", "fa": "Persian",
    "pl": "Polish", "pt": "Portuguese", "pa": "Punjabi", "ro": "Romanian",
    "ru": "Russian", "es": "Spanish", "sv": "Swedish", "ta": "Tamil",
    "te": "Telugu", "th": "Thai", "tr": "Turkish", "uk": "Ukrainian",
    "ur": "Urdu", "vi": "Vietnamese",
    "auto": "Auto Detect",
}


async def translate_text(
    text: str,
    target_lang: str,
    source_lang: str = "auto",
) -> str:
    """Translate text from source_lang to target_lang using Google Translate.

    Args:
        text: The source text to translate.
        target_lang: BCP-47 target language code (e.g. 'es', 'hi', 'ja').
        source_lang: BCP-47 source language code or 'auto' for auto-detect.

    Returns:
        Translated string, or empty string on failure.
    """
    if not text.strip():
        return ""

    src_name = LANG_NAMES.get(source_lang, source_lang)
    tgt_name = LANG_NAMES.get(target_lang, target_lang)
    print(f"[TRANSLATE] '{text[:60]}' | {src_name} → {tgt_name}")

    def _translate_sync() -> str:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        return translator.translate(text)

    try:
        result = await asyncio.to_thread(_translate_sync)
        result = (result or "").strip()
        print(f"[TRANSLATE] Result: '{result[:60]}'")
        return result
    except Exception as e:
        print(f"[TRANSLATE] Error: {e}")
        return ""
