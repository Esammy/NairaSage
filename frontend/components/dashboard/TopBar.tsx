"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Lock, Shield, User } from "lucide-react";
import { clearAuth, useAuthStore } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/chat", label: "Coordinator" },
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/investments", label: "Investments" },
  { href: "/dashboard/goals", label: "Goals" },
];

export function TopBar() {
  const pathname = usePathname();
  const email = useAuthStore((s) => s.user?.email);

  return (
    <div className="fixed top-0 left-0 right-0 h-20 bg-surface/90 backdrop-blur-md z-30 flex items-center justify-between px-4 sm:px-8 border-b border-ink-faint/10">
      <div className="flex items-center gap-6 lg:gap-12 ml-16 lg:ml-20 min-w-0">
        <Link href="/dashboard" className="text-lg font-bold text-ns-primary shrink-0 truncate">
          NairaSage
        </Link>
        <nav className="hidden lg:flex items-center gap-4 text-sm font-medium text-ink-muted">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-2 border-b-2 transition-colors whitespace-nowrap ${
                  active ? "text-ns-primary border-ns-primary" : "border-transparent hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 mr-4 sm:mr-8 lg:mr-20 shrink-0">
        <Link
          href="/"
          className="hidden sm:inline text-xs font-semibold text-ink-muted hover:text-ns-primary"
        >
          Website
        </Link>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E0F2FE]/50 text-[#0ea5e9] text-[10px] font-bold tracking-widest uppercase">
          <Shield className="w-3.5 h-3.5" aria-hidden />
          Session
        </div>
        <button type="button" className="hover:text-brand transition-colors p-1" aria-label="Lock">
          <Lock className="w-5 h-5" />
        </button>
        <button type="button" className="hover:text-brand transition-colors relative p-1" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#ef4444] border-2 border-surface" />
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline max-w-[140px] truncate text-xs text-ink-muted" title={email}>
            {email || ""}
          </span>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-ink text-surface flex items-center justify-center hover:bg-brand transition-colors"
            aria-label="Account"
          >
            <User className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              clearAuth();
              window.location.href = "/";
            }}
            className="text-xs font-semibold text-ink-muted hover:text-ns-primary"
          >
            Out
          </button>
        </div>
      </div>
    </div>
  );
}
