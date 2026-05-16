const WORKLET_URL = "/voice/pcm-processor.js";

/** Target chunk length: 100 ms at 16 kHz (AssemblyAI recommends >= 50 ms). */
const CHUNK_SAMPLES = 1600;

function mergeInt16(a: Int16Array, b: Int16Array): Int16Array {
  const m = new Int16Array(a.length + b.length);
  m.set(a);
  m.set(b, a.length);
  return m;
}

export type Microphone = {
  requestPermission: () => Promise<void>;
  startRecording: (
    onChunk: (pcm16: Int16Array) => void,
    onLevel?: (rms: number) => void
  ) => Promise<void>;
  stopRecording: () => void;
};

export function createMicrophone(): Microphone {
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let queue: Int16Array | null = null;

  return {
    async requestPermission() {
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    },

    async startRecording(onChunk, onLevel) {
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      queue = null;
      audioContext = new AudioContext({
        sampleRate: 16_000,
        latencyHint: "balanced",
      });
      source = audioContext.createMediaStreamSource(stream);
      await audioContext.audioWorklet.addModule(WORKLET_URL);
      workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      workletNode.port.onmessage = (event: MessageEvent) => {
        const { audio_data, rms } = event.data as {
          audio_data: ArrayBuffer;
          rms?: number;
        };
        if (typeof rms === "number") {
          onLevel?.(rms);
        }
        const current = new Int16Array(audio_data);
        queue = queue && queue.length ? mergeInt16(queue, current) : current;
        const sr = audioContext?.sampleRate ?? 16_000;
        while (queue && queue.length * (1000 / sr) >= 100) {
          const take = Math.min(CHUNK_SAMPLES, queue.length);
          const frame = new Int16Array(queue.subarray(0, take));
          onChunk(frame);
          queue = queue.length > take ? queue.subarray(take) : null;
        }
      };
    },

    stopRecording() {
      queue = null;
      try {
        if (workletNode) {
          workletNode.port.onmessage = null;
          workletNode.disconnect();
        }
      } catch {
        /* ignore */
      }
      workletNode = null;
      try {
        source?.disconnect();
      } catch {
        /* ignore */
      }
      source = null;
      void audioContext?.close().catch(() => {});
      audioContext = null;
      if (stream) {
        for (const t of stream.getTracks()) {
          t.stop();
        }
        stream = null;
      }
    },
  };
}
