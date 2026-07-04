/**
 * AudioWorklet: float32 mic samples to pcm_s16le for AssemblyAI streaming.
 * AudioContext should use sampleRate 16000 so no resampling is needed here.
 */
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch || !ch.length) {
      return true;
    }
    const out = new Int16Array(ch.length);
    let sum = 0;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      sum += s * s;
    }
    const rms = Math.sqrt(sum / ch.length);
    this.port.postMessage({ audio_data: out.buffer, rms }, [out.buffer]);
    return true;
  }
}

registerProcessor("pcm-processor", PcmProcessor);
