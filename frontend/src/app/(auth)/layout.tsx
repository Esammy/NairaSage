import React from "react";
import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-28 relative z-10 bg-background">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Link
            href="/"
            className="inline-block mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <BrandMark size="lg" />
          </Link>
          {children}
        </div>
      </div>

      <div className="hidden lg:flex relative w-1/2 flex-col justify-center border-l border-border bg-surface-elevated px-12 xl:px-16">
        <div className="max-w-md">
          <p className="text-[11px] uppercase tracking-[0.14em] text-primary font-semibold mb-4">
            Wealth OS
          </p>
          <h2 className="font-display text-3xl xl:text-4xl font-semibold tracking-tight text-foreground leading-snug">
            Calm guidance for Nigerian money decisions.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Thirteen specialist agents. One clear next step. Built for inflation, tax, and deals
            that Western finance apps miss.
          </p>
        </div>
      </div>
    </div>
  );
}
