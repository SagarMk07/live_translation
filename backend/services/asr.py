import asyncio
import os
import struct
import threading

from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents


class DeepgramASR:
    def __init__(self, partial_callback, final_callback):
        self.api_key = os.getenv("DEEPGRAM_API_KEY", "")
        self.partial_callback = partial_callback
        self.final_callback = final_callback
        self.dg_connection = None
        self.loop = None
        self.connected = False
        self.reconnect_attempted = False
        self.disabled = False
        self.chunk_count = 0
        self._lock = threading.RLock()

    def is_connected(self) -> bool:
        with self._lock:
            return self.connected and self.dg_connection is not None

    async def connect(self):
        if not self.api_key:
            self.disabled = True
            print("[ASR] WARNING: DEEPGRAM_API_KEY not set - ASR disabled")
            return

        self.loop = asyncio.get_running_loop()
        self.reconnect_attempted = False
        self._connect_connection()

    def _connect_connection(self) -> bool:
        with self._lock:
            if self.connected and self.dg_connection is not None:
                return True

        self._close_connection()

        print("[ASR] Opening Deepgram connection")
        client = DeepgramClient(self.api_key)
        connection = client.listen.websocket.v("1")
        connection.on(LiveTranscriptionEvents.Open, self.on_open)
        connection.on(LiveTranscriptionEvents.Transcript, self.on_message)
        connection.on(LiveTranscriptionEvents.Close, self.on_close)
        connection.on(LiveTranscriptionEvents.Error, self.on_error)

        # nova-2 with detect_language=True supports auto language detection
        # across 30+ languages including Hindi, Tamil, Spanish, French, etc.
        options = LiveOptions(
            model="nova-2",
            detect_language=True,
            encoding="linear16",
            sample_rate=16000,
            channels=1,
            smart_format=True,
            interim_results=True,
            endpointing=300,
            punctuate=True,
        )

        started = connection.start(options)
        if not started:
            with self._lock:
                self.connected = False
                self.dg_connection = None
            raise RuntimeError("Deepgram WebSocket failed to start")

        with self._lock:
            self.dg_connection = connection
            self.connected = True
        print("[ASR] Deepgram connected: True (multilingual detect_language=True)")
        return True

    def _close_connection(self):
        with self._lock:
            if self.dg_connection is None:
                self.connected = False
                return
            old_connection = self.dg_connection
            self.dg_connection = None
            self.connected = False

        try:
            old_connection.finish()
        except Exception as e:
            print(f"[ASR] Close old Deepgram connection failed: {e}")

    def _mark_disconnected(self, reason: str, connection=None):
        with self._lock:
            if connection is not None and connection is not self.dg_connection:
                print(f"[ASR] Ignoring stale Deepgram disconnect: {reason}")
                return
            self.connected = False
            self.dg_connection = None
        print(f"[ASR] Deepgram disconnected: {reason}")

    def on_open(self, _dg_connection, open=None, **kwargs):
        with self._lock:
            self.connected = True
        print(f"[ASR] Deepgram open event: {open}")

    def on_close(self, _dg_connection, close=None, **kwargs):
        self._mark_disconnected(f"close event {close}", _dg_connection)

    def on_error(self, _dg_connection, error=None, **kwargs):
        self._mark_disconnected(f"error event {error}", _dg_connection)

    def _extract_detected_lang(self, result):
        """Extract detected language code and confidence from Deepgram result.
        Tries multiple attribute paths for SDK compatibility.
        Returns (lang_code, confidence).
        """
        try:
            alt = result.channel.alternatives[0]
            # Nova-2 with detect_language returns languages list on the alternative
            if hasattr(alt, 'languages') and alt.languages:
                lang_obj = alt.languages[0]
                if isinstance(lang_obj, dict):
                    return lang_obj.get('language', 'en'), lang_obj.get('confidence', 1.0)
                return (
                    getattr(lang_obj, 'language', 'en'),
                    getattr(lang_obj, 'confidence', 1.0)
                )
        except (AttributeError, IndexError):
            pass

        try:
            # Some SDK versions put it on the result directly
            dl = getattr(result, 'detected_language', None)
            if dl:
                return dl, 1.0
        except AttributeError:
            pass

        return 'en', 1.0

    def on_message(self, _dg_connection, result, **kwargs):
        try:
            text = result.channel.alternatives[0].transcript
        except (AttributeError, IndexError):
            return

        if not text:
            return

        detected_lang, confidence = self._extract_detected_lang(result)
        print(f"[ASR] Transcript: '{text}' | lang={detected_lang} ({confidence:.2f})")

        if self.loop is None or self.loop.is_closed():
            return

        callback = self.final_callback if result.is_final else self.partial_callback
        self.loop.call_soon_threadsafe(
            asyncio.create_task,
            callback(text, detected_lang, confidence)
        )

    def send_audio(self, chunk: bytes):
        self._log_pcm_stats(chunk)

        if self.disabled:
            return

        if not self.is_connected():
            if not self._reconnect_once():
                return

        if not self._send(chunk):
            self._mark_disconnected("send returned False")
            if self._reconnect_once():
                if not self._send(chunk):
                    self._mark_disconnected("send failed after reconnect")

    def _log_pcm_stats(self, chunk: bytes):
        self.chunk_count += 1
        if len(chunk) < 2:
            return

        sample_count = len(chunk) // 2
        samples = struct.unpack(f"<{sample_count}h", chunk[:sample_count * 2])
        peak = max(abs(s) for s in samples)
        rms = int((sum(s * s for s in samples) / sample_count) ** 0.5)

        if self.chunk_count % 20 == 1 or peak < 100:
            print(f"[ASR PCM] samples={sample_count} peak={peak} rms={rms}")
        if peak < 100:
            print("[ASR PCM] WARNING: backend is receiving near-silent PCM")

    def _send(self, chunk: bytes) -> bool:
        with self._lock:
            connection = self.dg_connection
            connected = self.connected

        if not connected or connection is None:
            return False

        try:
            sent = connection.send(chunk)
        except Exception as e:
            print(f"[ASR] Deepgram send exception: {e}")
            return False

        if not sent:
            print("[ASR] Deepgram send failed")
            return False

        return True

    def _reconnect_once(self) -> bool:
        with self._lock:
            if self.reconnect_attempted:
                return False
            self.reconnect_attempted = True

        print("[ASR] Deepgram reconnect attempt…")
        try:
            result = self._connect_connection()
        except Exception as e:
            print(f"[ASR] Deepgram reconnect failed: {e}")
            result = False

        with self._lock:
            self.reconnect_attempted = False

        return result

    async def finish(self):
        with self._lock:
            self.disabled = True
        self._close_connection()
        self.loop = None
        print("[ASR] Finished")
