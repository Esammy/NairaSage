"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  LayoutDashboard,
  Receipt,
  MoveRight,
  Map,
  ListOrdered,
  Triangle,
  Handshake,
  BookOpen,
  MessageCircle,
  Settings,
  Brain,
  ChevronDown,
  Target,
  type LucideIcon,
} from "lucide-react";
import { CITATION_DISCLOSURE } from "@/lib/wealth";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  blurb: string;
};

type NavGroupId = "today" | "strategy" | "learn";

const GROUPS: Array<{ id: NavGroupId; label: string; items: NavItem[] }> = [
  {
    id: "today",
    label: "Today",
    items: [
      { name: "Cockpit", href: "/wealth", icon: LayoutDashboard, blurb: "Freedom Ratio" },
      { name: "Statement", href: "/wealth/statement", icon: Receipt, blurb: "Income / Expense / Asset / Liability" },
      {
        name: "Next action",
        href: "/wealth/chat?prompt=What%20is%20my%20one%20next%20action%20to%20raise%20my%20investor%20level%3F",
        icon: Target,
        blurb: "Coach-guided step",
      },
    ],
  },
  {
    id: "strategy",
    label: "Strategy",
    items: [
      { name: "Quadrant", href: "/wealth/quadrant", icon: MoveRight, blurb: "E S B I" },
      { name: "Path", href: "/wealth/path", icon: Map, blurb: "5 Phases" },
      { name: "Levels", href: "/wealth/levels", icon: ListOrdered, blurb: "7 Investor Levels" },
      { name: "Business", href: "/wealth/business", icon: Triangle, blurb: "B-I Triangle" },
      { name: "Deals", href: "/wealth/deals", icon: Handshake, blurb: "10 Investor Controls" },
    ],
  },
  {
    id: "learn",
    label: "Learn & coach",
    items: [
      { name: "Library", href: "/wealth/library", icon: BookOpen, blurb: "Lessons & scenarios" },
      { name: "Coach", href: "/wealth/chat", icon: MessageCircle, blurb: "NairaSage Coach" },
      { name: "Memory", href: "/wealth/memory", icon: Brain, blurb: "What the coach remembers" },
      { name: "Settings", href: "/wealth/settings", icon: Settings, blurb: "Profile & preferences" },
    ],
  },
];

const STORAGE_KEY = "nairasage-sidebar-groups";

type GroupState = Record<NavGroupId, boolean>;

const DEFAULT_EXPANDED: GroupState = {
  today: true,
  strategy: false,
  learn: false,
};

function loadGroupState(): GroupState {
  if (typeof window === "undefined") return DEFAULT_EXPANDED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXPANDED;
    const parsed = JSON.parse(raw) as Partial<GroupState>;
    return {
      today: parsed.today ?? true,
      strategy: parsed.strategy ?? false,
      learn: parsed.learn ?? false,
    };
  } catch {
    return DEFAULT_EXPANDED;
  }
}

function isItemActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/wealth") {
    return pathname === "/wealth" || pathname === "/wealth/";
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isItemActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`group flex items-start rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
      }`}
    >
      <item.icon
        className={`mr-3 mt-0.5 h-5 w-5 flex-shrink-0 ${
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        }`}
        aria-hidden="true"
      />
      <span className="flex flex-col">
        <span>{item.name}</span>
        <span className="text-[10px] text-muted-foreground group-hover:text-foreground/80">{item.blurb}</span>
      </span>
    </Link>
  );
}

export function WealthSidebar() {
  const pathname = usePathname() || "";
  const [expanded, setExpanded] = useState<GroupState>(DEFAULT_EXPANDED);
  const [citationOpen, setCitationOpen] = useState(false);

  useEffect(() => {
    // Deferred: localStorage is read post-hydration without a sync re-render.
    void Promise.resolve().then(() => setExpanded(loadGroupState()));
  }, []);

  const toggleGroup = useCallback((id: NavGroupId) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar glass-panel">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/">
          <BrandMark />
        </Link>
      </div>
      <div className="px-4 pb-2 -mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">NairaSage Wealth Cockpit</div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
        <nav className="flex-1 space-y-3" aria-label="Wealth navigation">
          {GROUPS.map((group) => (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-expanded={expanded[group.id]}
              >
                {group.label}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${expanded[group.id] ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {expanded[group.id] ? (
                <ul className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.name}>
                      <NavLink item={item} pathname={pathname} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="mt-6 border-t border-border/50 pt-4">
          <Link
            href="/dashboard/settings"
            className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <Settings className="mr-3 h-5 w-5 flex-shrink-0 opacity-60" aria-hidden />
            Account (legacy)
          </Link>
        </div>

        <details
          className="mt-4 rounded-md border border-border/50 bg-muted/20"
          open={citationOpen}
          onToggle={(e) => setCitationOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer px-2 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md">
            Why we cite sources
          </summary>
          <p className="px-2 pb-2 text-[9px] leading-snug text-muted-foreground/90">{CITATION_DISCLOSURE}</p>
        </details>
      </div>
    </div>
  );
}
