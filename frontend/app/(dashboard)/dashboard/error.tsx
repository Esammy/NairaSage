"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-ink-faint/20 bg-white p-8 text-center">
      <h2 className="text-lg font-bold text-brand">This view failed to load</h2>
      <p className="mt-2 text-sm text-ink-muted">Try again or return to the dashboard home.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light"
        >
          Retry
        </button>
        <Link href="/dashboard" className="rounded-lg border border-ink-faint/30 px-4 py-2 text-sm font-semibold">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
