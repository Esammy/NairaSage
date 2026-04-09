"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootError({
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
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-16 text-ink">
      <h1 className="text-2xl font-bold text-brand">Something went wrong</h1>
      <p className="mt-3 max-w-md text-center text-sm text-ink-muted">
        An unexpected error occurred. You can try again or return home.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light"
        >
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-ink-faint/30 px-4 py-2 text-sm font-semibold hover:bg-surface">
          Home
        </Link>
      </div>
    </div>
  );
}
