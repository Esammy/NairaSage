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
import { VOICE_MODE, transcribePcmChunks } from "@/lib/voice/qwen-transcribe";

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
  const pcmChunksRef = useRef<Int16Array[]>([]);
  const transcribingRef = useRef(false);
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
    pcmChunksRef.current = [];
    listeningRef.current = false;
    setListening(false);
    setPartial("");
    partialRef.current = "";
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    cleanupSession();
  }, [cleanupSession]);

  /** Qwen push-to-talk: first tap records, second tap uploads + transcribes. */
  const startQwen = useCallback(async () => {
    if (listeningRef.current || transcribingRef.current) return;
    setError(null);
    const mic = createMicrophone();
    micRef.current = mic;
    try {
      await mic.requestPermission();
    } catch {
      setError("Microphone permission is required for voice.");
      micRef.current = null;
      return;
    }
    pcmChunksRef.current = [];
    listeningRef.current = true;
    setListening(true);
    setPartial("Listening — tap the mic again when you finish speaking");
    optsRef.current.onBargeIn?.();
    try {
      await mic.startRecording(
        (chunk) => {
          if (listeningRef.current) pcmChunksRef.current.push(chunk);
        },
        (rms) => setLevel(Math.min(1, rms * 10))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start voice");
      cleanupSession();
    }
  }, [cleanupSession]);

  const finishQwen = useCallback(async () => {
    if (!listeningRef.current || transcribingRef.current) return;
    const chunks = pcmChunksRef.current;
    pcmChunksRef.current = [];
    micRef.current?.stopRecording();
    micRef.current = null;
    listeningRef.current = false;
    setLevel(0);
    if (!chunks.length) {
      setListening(false);
      setPartial("");
      return;
    }
    transcribingRef.current = true;
    setPartial("Transcribing…");
    try {
      const text = await transcribePcmChunks(chunks);
      if (text) {
        optsRef.current.onFinal(text);
      } else {
        setError("I didn't catch that — please try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      transcribingRef.current = false;
      setListening(false);
      setPartial("");
      partialRef.current = "";
    }
  }, []);

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
    if (VOICE_MODE === "qwen") {
      await startQwen();
      return;
    }
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
  }, [buildHandlers, cleanupSession, startQwen]);

  const toggle = useCallback(() => {
    if (VOICE_MODE === "qwen") {
      if (listeningRef.current) {
        void finishQwen();
      } else {
        void startQwen();
      }
      return;
    }
    if (listeningRef.current) {
      stop();
    } else {
      void start();
    }
  }, [start, stop, startQwen, finishQwen]);

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
