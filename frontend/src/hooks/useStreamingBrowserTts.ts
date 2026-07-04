"use client";

import { useEffect, useRef } from "react";
import { StreamingBrowserTts } from "@/lib/voice/streaming-tts";

export function useStreamingBrowserTts(lang: string) {
  const ref = useRef<StreamingBrowserTts | null>(null);
  useEffect(() => {
    ref.current = new StreamingBrowserTts({ lang });
    return () => {
      ref.current?.cancelAll();
      ref.current = null;
    };
  }, [lang]);
  return ref;
}
