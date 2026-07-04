"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 30 minutes without input → sign out; warning at 25 minutes. */
const IDLE_MS = 30 * 60 * 1000;
const WARNING_MS = 25 * 60 * 1000;
const CHECK_INTERVAL_MS = 15_000;

async function performLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    /* still redirect */
  }
  window.location.assign("/login?reason=timeout");
}

/**
 * Signs the user out after idle time while layout is mounted.
 * Shows a soft warning before the hard logout.
 */
export function useIdleSessionLogout() {
  // 0 = "not yet marked"; stamped on mount and on every user input event.
  const lastActivityRef = useRef(0);
  const loggingOutRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);

  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    void fetch("/api/auth/refresh", { method: "POST", credentials: "include" }).catch(() => {
      /* client timer reset still helps; refresh extends server JWT when cookies exist */
    });
  }, []);

  const signOutNow = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    void performLogout();
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    const mark = () => {
      lastActivityRef.current = Date.now();
      setShowWarning(false);
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

      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_MS) {
        loggingOutRef.current = true;
        void performLogout();
        return;
      }
      if (idle >= WARNING_MS) {
        setShowWarning(true);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, mark, { capture: true } as EventListenerOptions);
      }
      window.clearInterval(id);
    };
  }, []);

  return { showWarning, extendSession, signOutNow };
}
