"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WealthSidebar } from "@/components/wealth/WealthSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { NairaSageQuickChat } from "@/components/agent/CoordinatorChat";
import { CommandPalette } from "@/components/wealth/CommandPalette";
import { IdleSessionWarning } from "@/components/layout/IdleSessionWarning";
import { useIdleSessionLogout } from "@/hooks/useIdleSessionLogout";
import { OPEN_WEALTH_COACH_EVENT } from "@/lib/wealth-coach";

export default function WealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [coachPrefill, setCoachPrefill] = useState<string | undefined>(undefined);

  const { showWarning, extendSession, signOutNow } = useIdleSessionLogout();

  useEffect(() => {
    const h = (e: Event) => {
      const ce = e as CustomEvent<{ prompt?: string }>;
      setIsChatOpen(true);
      if (ce.detail?.prompt) setCoachPrefill(ce.detail.prompt);
    };
    window.addEventListener(OPEN_WEALTH_COACH_EVENT, h);
    return () => window.removeEventListener(OPEN_WEALTH_COACH_EVENT, h);
  }, []);

  const consumePrefill = useCallback(() => {
    setCoachPrefill(undefined);
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <CommandPalette />
      <IdleSessionWarning open={showWarning} onExtend={extendSession} onSignOut={signOutNow} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <WealthSidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onOpenChat={() => setIsChatOpen(true)}
          onMobileMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          askButtonLabel="Ask the Coach"
          showQuickJump
        />

        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-5 lg:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <NairaSageQuickChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        coachPrefill={coachPrefill}
        onConsumePrefill={consumePrefill}
      />
    </div>
  );
}
