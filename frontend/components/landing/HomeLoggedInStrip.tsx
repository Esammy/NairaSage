"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth";

export function HomeLoggedInStrip() {
  const [hydrated, setHydrated] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated || !accessToken) return null;

  return (
    <div className="border-b border-ns-primary/15 bg-ns-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-center sm:justify-between sm:text-left">
        <p className="text-sm text-ink-muted">
          You&apos;re signed in. Continue in the <span className="font-semibold text-ns-primary">app</span>.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-ns-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-light"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/chat"
            className="rounded-lg border border-ns-primary/30 px-3 py-1.5 text-xs font-semibold text-ns-primary hover:bg-white"
          >
            Coordinator
          </Link>
        </div>
      </div>
    </div>
  );
}
