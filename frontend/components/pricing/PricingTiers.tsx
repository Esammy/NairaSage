"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

const tiers = [
  {
    name: "Free",
    price: "N0",
    period: "/mo",
    plan: null as null | "pro" | "elite",
    cta: "Get for free",
    href: "/register",
    features: ["Budget tracking", "Basic dashboard", "Education snippets"],
  },
  {
    name: "Pro",
    price: "N2,500",
    period: "/mo",
    plan: "pro" as const,
    cta: "Choose Pro",
    href: "/register",
    highlight: true,
    badge: "Most popular",
    features: ["Coordinator chat", "Opportunity alerts", "Tax + risk insights", "Real-time goal mapping"],
  },
  {
    name: "Elite",
    price: "N5,000",
    period: "/mo",
    plan: "elite" as const,
    cta: "Go Elite",
    href: "/register",
    features: ["Priority intelligence", "Advanced monitoring", "Concierge onboarding", "Everything in Pro"],
  },
];

export function PricingTiers() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const checkout = async (plan: "pro" | "elite") => {
    setErr(null);
    if (!accessToken) {
      router.push(`/login?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    setBusy(plan);
    try {
      const res = await api.post("/billing/subscribe/", { plan });
      const url = res.data?.authorization_url as string | undefined;
      if (url) {
        window.location.href = url;
        return;
      }
      setErr("Paystack did not return a checkout URL. Check server Paystack plan codes.");
    } catch {
      setErr("Could not start checkout. Ensure you are signed in and billing is configured.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {err ? (
        <p className="mb-6 text-center text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-2xl border p-8 ${
              tier.highlight
                ? "border-ns-primary shadow-panel ring-2 ring-ns-primary/20"
                : "border-black/10 shadow-card"
            }`}
          >
            {tier.badge ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {tier.badge}
              </span>
            ) : null}
            <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted">{tier.name}</p>
            <p className="mt-3 text-4xl font-bold text-ns-primary">
              {tier.price}
              <span className="text-lg font-semibold text-ink-muted">{tier.period}</span>
            </p>
            <ul className="mt-8 flex-1 space-y-3">
              {tier.features.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm text-ink-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" strokeWidth={3} aria-hidden />
                  {bullet}
                </li>
              ))}
            </ul>
            {tier.plan ? (
              <button
                type="button"
                disabled={busy === tier.plan}
                onClick={() => void checkout(tier.plan!)}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-lg py-3.5 text-center text-sm font-semibold transition-colors disabled:opacity-60 ${
                  tier.highlight
                    ? "bg-ns-primary text-white hover:bg-brand-light"
                    : "border-2 border-ns-primary text-ns-primary hover:bg-ns-primary/5"
                }`}
              >
                {busy === tier.plan ? "Redirecting…" : tier.cta}
              </button>
            ) : (
              <Link
                href={tier.href}
                className="mt-8 inline-flex w-full items-center justify-center rounded-lg border-2 border-ns-primary py-3.5 text-center text-sm font-semibold text-ns-primary hover:bg-ns-primary/5"
              >
                {tier.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
