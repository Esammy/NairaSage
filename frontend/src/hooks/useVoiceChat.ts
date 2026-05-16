"use client";

import type { StreamingTranscriber } from "assemblyai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createStreamingSession,
  fetchAssemblyVoiceToken,
  openStreamingTranscriber,
  type TurnHandlers,
} from "@/lib/voice/assemblyai-browser";
import { createMicrophone, type Microphone } from "@/lib/voice/microphone";

export function useVoiceChat(opts: {
  onFinal: (text: string) => void;
  onBargeIn?: () => void;
}) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const micRef = useRef<Microphone | null>(null);
  const transcriberRef = useRef<StreamingTranscriber | null>(null);
  const listeningRef = useRef(false);
  const partialRef = useRef("");
  const dupGuardRef = useRef<{ text: string; at: number } | null>(null);
  const reconnectAttemptedRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const clearError = useCallback(() => setError(null), []);

  const cleanupSession = useCallback(() => {
    micRef.current?.stopRecording();
    micRef.current = null;
    const t = transcriberRef.current;
    transcriberRef.current = null;
    if (t) {
      void t.close(false).catch(() => {});
    }
    listeningRef.current = false;
    setListening(false);
    setPartial("");
    partialRef.current = "";
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    cleanupSession();
  }, [cleanupSession]);

  const buildHandlers = useCallback((): TurnHandlers => {
    return {
      onPartial: (text: string) => {
        partialRef.current = text;
        setPartial(text);
        optsRef.current.onBargeIn?.();
      },
      onFinal: (text: string) => {
        const now = Date.now();
        const g = dupGuardRef.current;
        if (g && g.text === text && now - g.at < 500) {
          return;
        }
        dupGuardRef.current = { text, at: now };
        setPartial("");
        partialRef.current = "";
        optsRef.current.onFinal(text);
      },
      onSpeechStarted: () => {
        optsRef.current.onBargeIn?.();
      },
      onError: (msg: string) => {
        if (!listeningRef.current) return;
        if (!reconnectAttemptedRef.current) {
          reconnectAttemptedRef.current = true;
          void (async () => {
            try {
              const old = transcriberRef.current;
              transcriberRef.current = null;
              if (old) {
                void old.close(false).catch(() => {});
              }
              const token = await fetchAssemblyVoiceToken();
              const t2 = await createStreamingSession(token, buildHandlers());
              transcriberRef.current = t2;
            } catch {
              setError(msg);
              cleanupSession();
            }
          })();
          return;
        }
        setError(msg);
        cleanupSession();
      },
    };
  }, [cleanupSession]);

  const start = useCallback(async () => {
    if (listeningRef.current) return;
    setError(null);
    reconnectAttemptedRef.current = false;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    const mic = createMicrophone();
    micRef.current = mic;

    try {
      await mic.requestPermission();
    } catch {
      setError("Microphone permission is required for voice.");
      micRef.current = null;
      return;
    }

    listeningRef.current = true;
    setListening(true);

    try {
      const transcriber = await openStreamingTranscriber(buildHandlers());
      transcriberRef.current = transcriber;
      await mic.startRecording(
        (chunk) => {
          const conn = transcriberRef.current;
          if (!conn || !listeningRef.current) return;
          try {
            conn.sendAudio(chunk.buffer);
          } catch (e) {
            console.error("voice sendAudio error", e);
          }
        },
        (rms) => setLevel(Math.min(1, rms * 10))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start voice";
      setError(msg);
      cleanupSession();
    }
  }, [buildHandlers, cleanupSession]);

  const toggle = useCallback(() => {
    if (listeningRef.current) {
      stop();
    } else {
      void start();
    }
  }, [start, stop]);

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, [cleanupSession]);

  return {
    listening,
    partial,
    level,
    error,
    start,
    stop,
    toggle,
    clearError,
  };
}
