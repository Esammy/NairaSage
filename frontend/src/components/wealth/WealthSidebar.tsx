"use client";

import React from "react";
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
} from "lucide-react";
import { CITATION_DISCLOSURE } from "@/lib/wealth";

const navigation = [
  { name: "Cockpit", href: "/wealth", icon: LayoutDashboard, blurb: "Freedom Ratio" },
  { name: "Statement", href: "/wealth/statement", icon: Receipt, blurb: "Income / Expense / Asset / Liability" },
  { name: "Quadrant", href: "/wealth/quadrant", icon: MoveRight, blurb: "E S B I" },
  { name: "Path", href: "/wealth/path", icon: Map, blurb: "5 Phases" },
  { name: "Levels", href: "/wealth/levels", icon: ListOrdered, blurb: "7 Investor Levels" },
  { name: "Business", href: "/wealth/business", icon: Triangle, blurb: "B-I Triangle" },
  { name: "Deals", href: "/wealth/deals", icon: Handshake, blurb: "10 Investor Controls" },
  { name: "Library", href: "/wealth/library", icon: BookOpen, blurb: "Lessons & scenarios" },
  { name: "Coach", href: "/wealth/chat", icon: MessageCircle, blurb: "NairaSage Coach" },
  { name: "Memory", href: "/wealth/memory", icon: Brain, blurb: "What the coach remembers" },
];

export function WealthSidebar() {
  const pathname = usePathname() || "";

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar glass-panel">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/">
          <BrandMark />
        </Link>
      </div>
      <div className="px-4 pb-2 -mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          NairaSage Wealth Cockpit
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/wealth"
                ? pathname === "/wealth" || pathname === "/wealth/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-start rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
                }`}
              >
                <item.icon
                  className={`mr-3 mt-0.5 h-5 w-5 flex-shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span>{item.name}</span>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground/80">
                    {item.blurb}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 space-y-1 border-t border-border/50 pt-4">
          <Link
            href="/wealth/settings"
            className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <Settings className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden />
            Settings
          </Link>
          <Link
            href="/dashboard/settings"
            className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <Settings className="mr-3 h-5 w-5 flex-shrink-0 opacity-60" aria-hidden />
            Account (legacy)
          </Link>
        </div>
        <p className="mt-4 text-[9px] leading-snug text-muted-foreground/90 px-1">
          {CITATION_DISCLOSURE}
        </p>
      </div>
    </div>
  );
}
