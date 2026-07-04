/** Qwen ASR push-to-talk support.
 *
 * VOICE_MODE selects the STT backend: "qwen" (default — push-to-talk via
 * Qwen Cloud, key stays server-side) or "assemblyai" (streaming, needs
 * ASSEMBLYAI_API_KEY). Set NEXT_PUBLIC_VOICE_MODE=assemblyai to switch back.
 */

export const VOICE_MODE: "qwen" | "assemblyai" =
  process.env.NEXT_PUBLIC_VOICE_MODE === "assemblyai" ? "assemblyai" : "qwen";

/** Wrap raw 16 kHz mono PCM16 chunks in a WAV container (the most reliably
 * accepted ASR format) and return it base64-encoded. */
export function pcm16ChunksToWavBase64(chunks: Int16Array[], sampleRate = 16_000): string {
  const totalSamples = chunks.reduce((s, c) => s + c.length, 0);
  const dataBytes = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      view.setInt16(offset, chunk[i], true);
      offset += 2;
    }
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const STEP = 0x8000;
  for (let i = 0; i < bytes.length; i += STEP) {
    binary += String.fromCharCode(...bytes.subarray(i, i + STEP));
  }
  return btoa(binary);
}

/** Sends recorded audio to Qwen ASR; resolves to the transcript text. */
export async function transcribePcmChunks(chunks: Int16Array[]): Promise<string> {
  if (!chunks.length) return "";
  const audio_b64 = pcm16ChunksToWavBase64(chunks);
  const res = await fetch("/api/django/wealth/voice/transcribe/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio_b64, format: "wav" }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(body.error || body.detail || "Transcription failed."));
  }
  return String(body.text || "").trim();
}
