"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Bot, Menu, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { openCommandPalette } from "@/lib/command-palette";

interface TopBarProps {
  onOpenChat: () => void;
  onMobileMenuToggle: () => void;
  askButtonLabel?: string;
  /** When true, show Quick jump (Ctrl+K) instead of a non-functional search field. */
  showQuickJump?: boolean;
}

type Me = {
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  display_name?: string;
};

type NotificationRow = {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

function displayName(me: Me | null) {
  if (!me) return "User";
  if (me.display_name?.trim()) return me.display_name.trim();
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

export function TopBar({
  onOpenChat,
  onMobileMenuToggle,
  askButtonLabel,
  showQuickJump = false,
}: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(t)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/django/notify/unread-count/", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (!cancelled) setUnreadCount(data.count ?? 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const res = await fetch("/api/django/notify/?page_size=10", {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as { results?: NotificationRow[] } | NotificationRow[];
        const rows = Array.isArray(data) ? data : data.results ?? [];
        setNotifications(rows);
      }
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch("/api/django/notify/mark-all-read/", {
        method: "POST",
        credentials: "include",
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* ignore */
    }
  };

  const name = displayName(me);
  const ini = initials(me);
  const settingsHref = pathname?.startsWith("/wealth") ? "/wealth/settings" : "/dashboard/settings";

  const handleSignOut = async () => {
    setProfileOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* still redirect */
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background/50 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 backdrop-blur-md sticky top-0 z-40">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileMenuToggle}>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </Button>

      <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {showQuickJump ? (
          <button
            type="button"
            onClick={openCommandPalette}
            className="relative flex flex-1 items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors max-w-xl"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Search or jump to…</span>
            <kbd className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Ctrl K
            </kbd>
          </button>
        ) : (
          <div className="flex flex-1 items-center text-sm text-muted-foreground">
            <span className="sr-only">Search</span>
            <span className="hidden sm:inline">Use the sidebar to navigate your dashboard.</span>
          </div>
        )}

        <div className="flex items-center gap-x-3 sm:gap-x-4">
          <Button
            variant="default"
            onClick={onOpenChat}
            className="bg-primary hover:bg-gold-600 text-primary-foreground shadow-lg shadow-gold-500/20 transition-all group"
          >
            <Bot className="mr-2 h-4 w-4 sm:group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">{askButtonLabel ?? "Ask NairaSage"}</span>
          </Button>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="relative -m-2.5 p-2.5 text-muted-foreground hover:text-foreground rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                setNotificationsOpen((v) => {
                  const next = !v;
                  if (next) void loadNotifications();
                  return next;
                });
                setProfileOpen(false);
              }}
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 ? (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>
            {notificationsOpen ? (
              <div
                role="dialog"
                className="absolute right-0 mt-2 w-80 max-h-[min(70vh,420px)] overflow-hidden rounded-lg border border-border bg-card shadow-xl z-50 flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
                  <p className="text-sm font-medium text-foreground">Notifications</p>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => void markAllNotificationsRead()}
                    >
                      Mark all read
                    </button>
                  ) : null}
                </div>
                <div className="overflow-y-auto p-2 flex-1">
                  {notificationsLoading ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
                  ) : notifications.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground leading-relaxed">
                      No alerts yet. When we spot rate moves, tax deadlines, or coach nuggets worth
                      your attention, they will show up here.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className={`rounded-md px-2 py-2 text-xs ${
                            n.is_read ? "text-muted-foreground" : "bg-primary/5 text-foreground"
                          }`}
                        >
                          <p className="font-medium">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-muted-foreground">{n.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotificationsOpen(false);
              }}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
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
            {profileOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-xl py-1 z-50"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  {me?.email ? (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{me.email}</p>
                  ) : null}
                </div>
                <Link
                  href={settingsHref}
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Settings
                </Link>
                <Link
                  href={settingsHref}
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                  onClick={() => setProfileOpen(false)}
                >
                  <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Account
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
