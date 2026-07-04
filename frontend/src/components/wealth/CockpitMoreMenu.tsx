"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWealthCoach } from "@/lib/wealth-coach";

export function CockpitMoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
        <span className="sr-only">More actions</span>
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-52 rounded-lg border border-border bg-card shadow-xl py-1 z-50 text-sm"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left hover:bg-muted"
            onClick={() => {
              openWealthCoach("Explain the Wealth Cockpit page and what Freedom Ratio means for me.");
              setOpen(false);
            }}
          >
            Explain this page
          </button>
          <Link
            href="/wealth/statement"
            role="menuitem"
            className="block px-3 py-2 hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Open full statement
          </Link>
          <Link
            href="/wealth/chat"
            role="menuitem"
            className="block px-3 py-2 hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Full coach chat
          </Link>
        </div>
      ) : null}
    </div>
  );
}
