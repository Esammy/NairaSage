"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { clearAuth, useAuthStore } from "@/lib/auth";

export function MarketingAuthNav() {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    return useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  const signOut = () => {
    clearAuth();
    window.location.href = "/";
  };

  const linkClass = "text-sm font-semibold text-ink-muted hover:text-ns-primary transition-colors";
  const ctaClass =
    "rounded-lg bg-ns-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-light transition-colors";

  if (!hydrated) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 animate-pulse rounded-lg bg-zinc-100" aria-hidden />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-100" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg border border-black/10 p-2 md:hidden"
        aria-expanded={open}
        aria-label="Open menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div
        className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full z-50 flex-col gap-3 border-b border-black/5 bg-white px-4 py-4 shadow-sm md:static md:flex md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {accessToken ? (
          <>
            <Link href="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
              Dashboard
            </Link>
            <Link href="/dashboard/chat" className={linkClass} onClick={() => setOpen(false)}>
              Coordinator
            </Link>
            <Link href="/pricing" className={linkClass} onClick={() => setOpen(false)}>
              Pricing
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className={`${linkClass} text-left`}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={linkClass} onClick={() => setOpen(false)}>
              Login
            </Link>
            <Link href="/register" className={ctaClass} onClick={() => setOpen(false)}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </>
  );
}
