"use client";

import React, { useEffect, useState } from "react";
import { Bell, Search, Bot, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopBarProps {
  onOpenChat: () => void;
  onMobileMenuToggle: () => void;
}

type Me = {
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

function displayName(me: Me | null) {
  if (!me) return "User";
  const fn = (me.first_name || "").trim();
  const ln = (me.last_name || "").trim();
  if (fn || ln) return `${fn} ${ln}`.trim();
  return me.username || me.email?.split("@")[0] || "User";
}

function initials(me: Me | null) {
  if (!me) return "U";
  const fn = (me.first_name || "").trim();
  const ln = (me.last_name || "").trim();
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  if (fn) return fn.slice(0, 2).toUpperCase();
  const src = me.username || me.email || "U";
  return src.slice(0, 2).toUpperCase();
}

export function TopBar({ onOpenChat, onMobileMenuToggle }: TopBarProps) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/django/auth/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMe(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const name = displayName(me);
  const ini = initials(me);

  return (
    <div className="flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background/50 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 backdrop-blur-md sticky top-0 z-40">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileMenuToggle}>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </Button>

      <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1" action="#" method="GET" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <Search
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-foreground placeholder:text-muted-foreground bg-transparent focus:ring-0 sm:text-sm"
            placeholder="Search transactions, goals..."
            type="search"
            name="search"
          />
        </form>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Button
            variant="default"
            onClick={onOpenChat}
            className="bg-primary hover:bg-gold-600 text-primary-foreground shadow-lg shadow-gold-500/20 transition-all group"
          >
            <Bot className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Ask NairaSage</span>
          </Button>

          <button type="button" className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground">
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          <div className="relative">
            <button type="button" className="-m-1.5 flex items-center p-1.5">
              <span className="sr-only">Open user menu</span>
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src="" alt="" />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{ini}</AvatarFallback>
              </Avatar>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-foreground" aria-hidden="true">
                  {name}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
