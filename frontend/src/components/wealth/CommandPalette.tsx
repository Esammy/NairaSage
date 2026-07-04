"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, MessageCircle, Brain, Settings, X, Search } from "lucide-react";
import { openWealthCoach } from "@/lib/wealth-coach";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/command-palette";
import { COACH_SUGGESTION_PROMPTS } from "@/lib/coach-prompts";

type SearchHit = {
  type: string;
  title: string;
  subtitle: string;
  route: string;
};

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

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSearchResults([]);
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") close();
    },
    [toggle, close]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, h);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, h);
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/django/search/?q=${encodeURIComponent(q)}&limit=8`,
            { credentials: "include" }
          );
          if (!res.ok) {
            if (!cancelled) setSearchResults([]);
            return;
          }
          const data = (await res.json()) as { results?: SearchHit[] };
          if (!cancelled) setSearchResults(data.results ?? []);
        } catch {
          if (!cancelled) setSearchResults([]);
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  if (!open) return null;

  const showPages = !query.trim();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, goals, deals…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            className="p-1 rounded-md hover:bg-muted text-muted-foreground"
            onClick={close}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2 text-sm">
          {query.trim() ? (
            <>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                Search results
              </div>
              {searching ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Searching…</p>
              ) : searchResults.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">No matches found.</p>
              ) : (
                <ul className="space-y-0.5">
                  {searchResults.map((hit, i) => (
                    <li key={`${hit.type}-${hit.route}-${i}`}>
                      <button
                        type="button"
                        className="w-full flex flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          router.push(hit.route);
                          close();
                        }}
                      >
                        <span className="font-medium text-foreground line-clamp-1">{hit.title}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                          {hit.subtitle} · {hit.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}

          {showPages ? (
            <>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-1">
                Pages
              </div>
              <ul className="space-y-0.5">
                {PAGES.map((p) => (
                  <li key={p.path}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        router.push(p.path);
                        close();
                      }}
                    >
                      <p.icon className="h-4 w-4 text-primary shrink-0" aria-hidden />
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2">
                Coach
              </div>
              <ul className="space-y-0.5">
                {COACH_SUGGESTION_PROMPTS.slice(0, 6).map((p) => (
                  <li key={p.label}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        openWealthCoach(p.prompt);
                        close();
                      }}
                    >
                      <MessageCircle className="h-4 w-4 text-primary shrink-0" aria-hidden />
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
          Ctrl+K to toggle · Esc to close
        </div>
      </div>
    </div>
  );
}
