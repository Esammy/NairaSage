"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command, LayoutDashboard, MessageCircle, Brain, Settings, X } from "lucide-react";
import { openWealthCoach } from "@/lib/wealth-coach";

const PAGES: Array<{ label: string; path: string; icon: React.ElementType }> = [
  { label: "Wealth Cockpit", path: "/wealth", icon: LayoutDashboard },
  { label: "Statement", path: "/wealth/statement", icon: LayoutDashboard },
  { label: "Quadrant", path: "/wealth/quadrant", icon: LayoutDashboard },
  { label: "Path", path: "/wealth/path", icon: LayoutDashboard },
  { label: "Levels", path: "/wealth/levels", icon: LayoutDashboard },
  { label: "Business (B-I Triangle)", path: "/wealth/business", icon: LayoutDashboard },
  { label: "Deals", path: "/wealth/deals", icon: LayoutDashboard },
  { label: "Library", path: "/wealth/library", icon: LayoutDashboard },
  { label: "Coach chat", path: "/wealth/chat", icon: MessageCircle },
  { label: "Coach memory", path: "/wealth/memory", icon: Brain },
  { label: "Wealth settings", path: "/wealth/settings", icon: Settings },
];

const PROMPTS: Array<{ label: string; prompt: string }> = [
  { label: "Explain my Freedom Ratio", prompt: "Explain my Freedom Ratio using my latest statement." },
  { label: "Next investor level step", prompt: "What is my one next action to raise my investor level?" },
  { label: "Score my latest deal", prompt: "Walk my latest deal through the 10 Investor Controls." },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Command className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="text-sm font-medium text-foreground">NairaSage palette</span>
          <button
            type="button"
            className="ml-auto p-1 rounded-md hover:bg-muted text-muted-foreground"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2 text-sm">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">Pages</div>
          <ul className="space-y-0.5">
            {PAGES.map((p) => (
              <li key={p.path}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    router.push(p.path);
                    setOpen(false);
                  }}
                >
                  <p.icon className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2">Coach</div>
          <ul className="space-y-0.5">
            {PROMPTS.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    openWealthCoach(p.prompt);
                    setOpen(false);
                  }}
                >
                  <MessageCircle className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  {p.label}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                onClick={() => {
                  router.push("/wealth/memory");
                  setOpen(false);
                }}
              >
                <Brain className="h-4 w-4 text-primary shrink-0" aria-hidden />
                Open memory viewer
              </button>
            </li>
            <li>
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                onClick={() => {
                  router.push("/wealth/chat");
                  setOpen(false);
                }}
              >
                <MessageCircle className="h-4 w-4 text-primary shrink-0" aria-hidden />
                Open actions log (chat)
              </button>
            </li>
          </ul>
        </div>
        <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
          Ctrl+K to toggle · Esc to close
        </div>
      </div>
    </div>
  );
}
