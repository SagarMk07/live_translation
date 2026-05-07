/**
 * PCM AudioWorklet Processor
 * Accumulates 4096 samples then transfers them to the main thread.
 * Replaces the deprecated ScriptProcessor which returns all-zero samples
 * on some Chrome/Windows WASAPI combinations.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._TARGET = 4096; // samples to accumulate before sending
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;

    // Accumulate samples
    for (let i = 0; i < ch.length; i++) {
      this._buf.push(ch[i]);
    }

    // Send once we have enough
    while (this._buf.length >= this._TARGET) {
      const slice = this._buf.splice(0, this._TARGET);
      const f32 = new Float32Array(slice);
      // Transfer buffer ownership (zero-copy)
      this.port.postMessage(f32.buffer, [f32.buffer]);
    }

    return true; // keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
