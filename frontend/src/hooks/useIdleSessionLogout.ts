"use client";

import { useEffect, useRef } from "react";

/** 30 minutes without pointer/keyboard/touch/wheel input → sign out (matches product policy). */
const IDLE_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 15_000;

/**
 * Signs the user out after a period of no engagement while this dashboard layout is mounted.
 * Tab hidden: timer pauses (no interval ticks); returning after long absence still evaluates idle from last activity.
 */
export function useIdleSessionLogout() {
  const lastActivityRef = useRef(Date.now());
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const mark = () => {
      lastActivityRef.current = Date.now();
    };

    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
    ];
    for (const ev of events) {
      window.addEventListener(ev, mark, { capture: true, passive: true });
    }

    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (loggingOutRef.current) return;
      if (Date.now() - lastActivityRef.current < IDLE_MS) return;
      loggingOutRef.current = true;
      void (async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {
          /* still redirect */
        }
        window.location.assign("/login?reason=timeout");
      })();
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, mark, { capture: true } as EventListenerOptions);
      }
      window.clearInterval(id);
    };
  }, []);
}
