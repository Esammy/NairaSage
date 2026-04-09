import type { ReactNode } from "react";
import { LightSiteFooter } from "@/components/landing/LightSiteFooter";
import { LightSiteHeader } from "@/components/landing/LightSiteHeader";

export function LightMarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <LightSiteHeader />
      {children}
      <LightSiteFooter />
    </div>
  );
}
