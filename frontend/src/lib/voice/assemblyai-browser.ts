import { StreamingTranscriber, type StreamingTranscriber as StreamingTranscriberType } from "assemblyai";

const TOKEN_PATH = "/api/django/wealth/voice/token/";

export type TurnHandlers = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onSpeechStarted?: () => void;
  onError?: (message: string) => void;
  onClose?: (code: number, reason: string) => void;
};

export async function fetchAssemblyVoiceToken(): Promise<string> {
  const r = await fetch(TOKEN_PATH, { credentials: "include" });
  let body: { detail?: unknown; token?: string } = {};
  try {
    body = (await r.json()) as { detail?: unknown; token?: string };
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    const d = body.detail;
    const msg =
      typeof d === "string"
        ? d
        : Array.isArray(d)
          ? d.map((x) => String(x)).join(" ")
          : "Could not get voice token";
    throw new Error(msg);
  }
  const token = body.token;
  if (!token) {
    throw new Error("Invalid voice token response");
  }
  return token;
}

function wireHandlers(transcriber: StreamingTranscriberType, handlers: TurnHandlers) {
  transcriber.on("turn", (turn: Record<string, unknown>) => {
    const text = String(turn.transcript ?? "").trim();
    if (!text) return;
    const end = turn.end_of_turn === true || turn.endOfTurn === true;
    if (end) {
      handlers.onFinal(text);
    } else {
      handlers.onPartial(text);
    }
  });
  // Browser runtime supports this event; SDK .d.ts may not list it.
  (transcriber as unknown as { on: (ev: string, fn: () => void) => void }).on(
    "speechStarted",
    () => {
      handlers.onSpeechStarted?.();
    }
  );
  transcriber.on("error", (err: Error) => {
    handlers.onError?.(err?.message || String(err));
  });
  transcriber.on("close", (code: number, reason: string) => {
    handlers.onClose?.(code, reason);
  });
}

export async function createStreamingSession(
  token: string,
  handlers: TurnHandlers
): Promise<StreamingTranscriberType> {
  const transcriber = new StreamingTranscriber({
    token,
    sampleRate: 16_000,
    formatTurns: true,
    speechModel: "universal-streaming-english",
  });
  wireHandlers(transcriber, handlers);
  await transcriber.connect();
  return transcriber;
}

export async function openStreamingTranscriber(
  handlers: TurnHandlers
): Promise<StreamingTranscriberType> {
  const token = await fetchAssemblyVoiceToken();
  return createStreamingSession(token, handlers);
}
