"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardProviders } from "@/components/dashboard/DashboardProviders";
import { EmailVerificationBanner } from "@/components/dashboard/EmailVerificationBanner";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { useAuthStore } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(
    () => typeof window !== "undefined" && useAuthStore.persist.hasHydrated()
  );
  const [expandedSide, setExpandedSide] = useState<"left" | "right" | "none">("none");

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    return useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
    }
  }, [hydrated, accessToken, pathname, router]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const leftThreshold = 120;
    const rightThreshold = window.innerWidth - 120;
    if (event.clientX <= leftThreshold) {
      setExpandedSide("left");
      return;
    }
    if (event.clientX >= rightThreshold) {
      setExpandedSide("right");
      return;
    }
    setExpandedSide("none");
  }, []);

  if (!hydrated || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-ink-muted text-sm">
        Checking session…
      </div>
    );
  }

  return (
    <DashboardProviders>
      <div className="min-h-screen bg-surface flex overflow-hidden" onMouseMove={handleMouseMove}>
        <LeftSidebar expanded={expandedSide === "left"} />
        <TopBar />
        <main className="flex-1 overflow-y-auto px-4 pt-20 pb-24 sm:px-8 md:px-16 lg:px-24 relative">
          <div className="max-w-4xl mx-auto py-8">
            <EmailVerificationBanner />
            {children}
          </div>
        </main>
        <RightSidebar expanded={expandedSide === "right"} />
      </div>
    </DashboardProviders>
  );
}
