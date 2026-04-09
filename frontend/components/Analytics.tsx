"use client";

import { useEffect, useRef } from "react";

export function Analytics() {
  const started = useRef(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || started.current) return;
    started.current = true;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    void import("posthog-js").then((mod) => {
      mod.default.init(key, {
        api_host: host,
        person_profiles: "identified_only",
      });
    });
  }, []);

  return null;
}
