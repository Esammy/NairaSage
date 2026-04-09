"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, BookOpen, Shield, History, Plus, type LucideIcon } from "lucide-react";
import api from "@/lib/api";

type LeftSidebarProps = {
  expanded: boolean;
};

type RecentRow = { id: number; user_query: string; created_at?: string };

export function LeftSidebar({ expanded }: LeftSidebarProps) {
  const [recent, setRecent] = useState<RecentRow[]>([]);

  useEffect(() => {
    void api
      .get("/agent/conversations/", { params: { page_size: 8 } })
      .then((res) => {
        const raw = res.data?.results ?? res.data;
        if (Array.isArray(raw)) setRecent(raw as RecentRow[]);
      })
      .catch(() => setRecent([]));
  }, []);

  return (
    <motion.div
      className="fixed left-0 top-0 bottom-0 z-40 hidden bg-surface/90 backdrop-blur-xl border-r border-ink-faint/20 lg:flex flex-col pt-20"
      initial={{ width: "80px" }}
      animate={{ width: expanded ? "320px" : "80px" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex flex-col h-full overflow-hidden w-[320px]">
        <div className="px-5 flex flex-col gap-6 mt-4">
          <SidebarIcon icon={TrendingUp} bg="bg-brand text-white" />
          <SidebarIcon icon={BookOpen} bg="bg-[#785E3A] text-white" />
          <SidebarIcon icon={Shield} bg="bg-[#E0F2FE] text-[#0ea5e9]" />
          <SidebarIcon icon={History} bg="bg-[#0f172a] text-white" />
        </div>

        <motion.div
          animate={{ opacity: expanded ? 1 : 0, pointerEvents: expanded ? "auto" : "none" }}
          transition={{ duration: 0.2 }}
          className="px-6 flex flex-col h-full pt-8 absolute top-20 left-0 right-0 w-[320px]"
        >
          <Link
            href="/dashboard/chat"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-brand text-white font-medium mb-6 hover:bg-brand-light transition-colors"
          >
            <Plus className="w-5 h-5" /> New command
          </Link>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Recent questions</div>
            {recent.length === 0 ? (
              <p className="text-xs text-ink-muted leading-relaxed">
                Your coordinator conversations will show here. Open chat to begin.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 pr-1">
                {recent.map((row) => {
                  const q = (row.user_query || "").trim();
                  const title = q.length > 64 ? `${q.slice(0, 64)}…` : q || "Question";
                  return (
                    <li key={row.id}>
                      <Link
                        href="/dashboard/chat"
                        className="block rounded-lg p-3 border border-transparent hover:bg-surface-card hover:border-ink-faint/10 transition-colors"
                      >
                        <p className="text-sm font-medium text-ink line-clamp-2">{title}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="pb-8 pt-4 border-t border-ink-faint/10 space-y-1.5 text-xs">
            <p className="font-bold uppercase tracking-wider text-ink-muted mb-2">Modules</p>
            <Link href="/dashboard" className="block font-medium text-ns-primary hover:underline">
              Overview
            </Link>
            <Link href="/dashboard/chat" className="block text-ink-muted hover:text-ink">
              Coordinator
            </Link>
            <Link href="/dashboard/accounts" className="block text-ink-muted hover:text-ink">
              Accounts
            </Link>
            <Link href="/dashboard/transactions" className="block text-ink-muted hover:text-ink">
              Transactions
            </Link>
            <Link href="/dashboard/investments" className="block text-ink-muted hover:text-ink">
              Investments
            </Link>
            <Link href="/dashboard/opportunities" className="block text-ink-muted hover:text-ink">
              Opportunities
            </Link>
            <Link href="/dashboard/goals" className="block text-ink-muted hover:text-ink">
              Goals
            </Link>
            <Link href="/dashboard/debt" className="block text-ink-muted hover:text-ink">
              Debt
            </Link>
            <Link href="/dashboard/tax" className="block text-ink-muted hover:text-ink">
              Tax
            </Link>
            <Link href="/dashboard/scenarios" className="block text-ink-muted hover:text-ink">
              Scenarios
            </Link>
            <Link href="/dashboard/coach" className="block text-ink-muted hover:text-ink">
              Coach
            </Link>
            <Link href="/dashboard/learn" className="block text-ink-muted hover:text-ink">
              Learn
            </Link>
            <Link href="/dashboard/settings" className="block text-ink-muted hover:text-ink">
              Settings
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SidebarIcon({ icon: Icon, bg }: { icon: LucideIcon; bg: string }) {
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${bg}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
}
