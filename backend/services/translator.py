import asyncio
from deep_translator import GoogleTranslator

# Human-readable language names (for logging only)
LANG_NAMES = {
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "hi": "Hindi",
    "zh": "Chinese",
    "zh-cn": "Chinese (Simplified)",
    "ja": "Japanese",
    "ar": "Arabic",
    "pt": "Portuguese",
    "ru": "Russian",
    "ko": "Korean",
    "it": "Italian",
    "en": "English",
}


async def translate_text(text: str, target_lang: str) -> str:
    """Translate English text to target_lang using Google Translate (free).

    Uses deep-translator which wraps Google Translate with no API key required.
    The synchronous call is offloaded to a thread pool so it never blocks the
    FastAPI event loop.

    Args:
        text: The English source text.
        target_lang: BCP-47 language code (e.g. 'es', 'hi', 'ja').

    Returns:
        Translated string, or empty string on failure.
    """
    if not text.strip():
        return ""

    lang_name = LANG_NAMES.get(target_lang, target_lang)
    print(f"Translating '{text}' -> {lang_name} ({target_lang})")

    def _translate_sync() -> str:
        """Synchronous translation — runs in thread pool."""
        translator = GoogleTranslator(source="auto", target=target_lang)
        return translator.translate(text)

    try:
        # Offload blocking HTTP call to thread pool — keeps event loop free
        result = await asyncio.to_thread(_translate_sync)
        result = (result or "").strip()
        print(f"Translation result: '{result}'")
        return result
    except Exception as e:
        print(f"Translation error: {e}")
        return ""
