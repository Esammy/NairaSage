"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Brain,
  Clock,
  Lock,
  LayoutDashboard,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/BrandMark";

type SessionState = "loading" | "guest" | "user";

export default function LandingPage() {
  const [session, setSession] = useState<SessionState>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/django/auth/me", { credentials: "include" });
        if (!cancelled) setSession(res.ok ? "user" : "guest");
      } catch {
        if (!cancelled) setSession("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoggedIn = session === "user";

  return (
    <div className="bg-background min-h-screen selection:bg-primary/25 overflow-x-hidden">
      <header className="fixed top-0 w-full z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <BrandMark />
          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-primary transition-colors">
              How it works
            </a>
            <a href="#agents" className="hover:text-primary transition-colors">
              Your AI team
            </a>
            <a href="#security" className="hover:text-primary transition-colors">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {session === "loading" ? (
              <div className="h-9 w-36 rounded-md bg-muted/60 animate-pulse" aria-hidden />
            ) : isLoggedIn ? (
              <>
                <Link
                  href="/wealth/chat"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hidden sm:inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="h-4 w-4" />
                  Coach
                </Link>
                <Link
                  href="/wealth/chat"
                  className="sm:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary/40"
                  aria-label="Open coach"
                >
                  <MessageCircle className="h-5 w-5" />
                </Link>
                <Link href="/wealth">
                  <Button className="h-9 px-4 rounded-md font-semibold gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Open Wealth OS
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors hidden sm:block"
                >
                  Log in
                </Link>
                <Link href="/register">
                  <Button className="h-9 px-5 rounded-md font-semibold">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero — brand, one headline, one sentence, CTA, one product visual */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <BrandMark size="hero" className="mb-8" />
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-foreground leading-[1.15]">
                Wealth decisions built for the Naira—not Silicon Valley defaults.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
                NairaSage is your private wealth OS: a society of 13 specialist agents that
                coordinate one clear answer for inflation, tax, debt, and deals in Nigeria.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {session === "loading" ? (
                  <div className="h-12 w-56 rounded-md bg-muted/60 animate-pulse" aria-hidden />
                ) : isLoggedIn ? (
                  <Link href="/wealth">
                    <Button size="lg" className="h-12 px-6 text-base font-semibold rounded-md gap-2 w-full sm:w-auto">
                      <LayoutDashboard className="h-5 w-5" />
                      Open your Wealth Cockpit
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/register">
                      <Button size="lg" className="h-12 px-6 text-base font-semibold rounded-md gap-2 w-full sm:w-auto">
                        Start building wealth
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-12 px-6 text-base rounded-md w-full sm:w-auto"
                      >
                        Log in
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Dominant product visual */}
            <div className="relative w-full">
              <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden shadow-2xl shadow-black/40">
                <div className="flex items-center gap-3 border-b border-border px-5 py-3.5 bg-card">
                  <div className="h-8 w-8 rounded-md border border-primary/30 bg-primary/10 flex items-center justify-center text-primary text-xs font-display font-bold">
                    N
                  </div>
                  <div>
                    <div className="font-display text-sm font-medium">Wealth Cockpit</div>
                    <div className="text-xs text-muted-foreground">Freedom Ratio · Next action</div>
                  </div>
                </div>
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-primary font-medium">
                      Next action
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      Move idle cash into an 18.5% money market fund
                    </p>
                  </div>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Freedom Ratio
                      </p>
                      <p className="font-display text-4xl font-semibold text-foreground tabular-money mt-1">
                        0.42
                      </p>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden mb-2">
                      <div className="h-full w-[42%] rounded-full bg-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Passive
                      </p>
                      <p className="font-semibold tabular-money mt-0.5">₦185,000</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Expenses
                      </p>
                      <p className="font-semibold tabular-money mt-0.5">₦440,000</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">Coach: </span>
                    Accountant + Scout coordinated. Confirm before any write.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="how-it-works" className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Why a co-pilot—not another spreadsheet
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Knowing what to do with money and actually doing it are different problems. NairaSage
              closes the gap for Nigerian professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {[
              {
                icon: TrendingUp,
                title: "Silent value erosion",
                body: "Idle Naira in low-yield accounts while inflation runs hot. You need a system that flags surplus and points to better instruments.",
              },
              {
                icon: Brain,
                title: "Emotional blindspots",
                body: "FOMO, panic, and lifestyle creep destroy wealth. The coach intervenes with cited guidance before costly mistakes.",
              },
              {
                icon: Clock,
                title: "Missed opportunities",
                body: "You cannot watch FGN bonds, T-bills, and policy shifts all day. Specialists surface what fits your Financial DNA.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-3">
                <item.icon className="w-6 h-6 text-primary" aria-hidden />
                <h3 className="font-display text-xl font-medium text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent society */}
      <section id="agents" className="py-20 border-t border-border/50 bg-secondary/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                Not a chatbot.
                <br />
                <span className="text-primary">A financial firm in your pocket.</span>
              </h2>
              <p className="text-muted-foreground mt-4 text-lg leading-relaxed max-w-lg">
                Thirteen specialists route, work in parallel, and synthesize one grounded answer—
                accountant, tax, debt, risk, investment, and more—tuned to Nigerian reality.
              </p>
            </div>
            <ul className="space-y-6">
              {[
                {
                  title: "The Accountant",
                  desc: "Categorizes spending, spots subscription creep, and flags anomalies.",
                },
                {
                  title: "The Investment Advisor",
                  desc: "Builds portfolios across NGX, funds, and risk-appropriate instruments.",
                },
                {
                  title: "The Opportunity Scout",
                  desc: "Surfaces grants, programs, and high-yield windows that fit your profile.",
                },
                {
                  title: "The Tax Planner",
                  desc: "Flags deductible expenses and FIRS deadlines so you never overpay.",
                },
              ].map((agent) => (
                <li key={agent.title} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <h4 className="font-display font-medium text-foreground">{agent.title}</h4>
                    <p className="text-muted-foreground text-[15px] mt-0.5">{agent.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Shield className="w-10 h-10 text-primary mx-auto mb-5" aria-hidden />
          <h2 className="font-display text-3xl font-semibold tracking-tight mb-4">
            Built for trust
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            NDPA-aware privacy, read-only bank connections where available, and confirm-before-write
            actions. We never store your bank login credentials.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {[
              "Read-only API access",
              "Encrypted in transit",
              "Zero credential storage",
            ].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-surface-elevated text-muted-foreground"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Ready for a clearer next step?
          </h2>
          <p className="text-muted-foreground mb-8">
            {session === "loading" ? (
              <span className="inline-block h-5 w-64 rounded bg-muted/50 animate-pulse" aria-hidden />
            ) : isLoggedIn ? (
              "You're signed in—open the cockpit to review money, goals, and your next move."
            ) : (
              "Create an account and open your Wealth OS in minutes."
            )}
          </p>
          {session === "loading" ? (
            <div className="h-12 w-48 mx-auto rounded-md bg-muted/60 animate-pulse" aria-hidden />
          ) : isLoggedIn ? (
            <Link href="/wealth">
              <Button size="lg" className="h-12 px-6 text-base font-semibold rounded-md gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Continue to Wealth OS
              </Button>
            </Link>
          ) : (
            <Link href="/register">
              <Button size="lg" className="h-12 px-6 text-base font-semibold rounded-md">
                Create free account
              </Button>
            </Link>
          )}
        </div>
      </section>

      <footer className="border-t border-border/50 py-10 text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <BrandMark />
            <span>© {new Date().getFullYear()} NairaSage Tech.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/security" className="hover:text-primary transition-colors">
              Security
            </Link>
          </div>
        </div>
        <p className="mx-auto max-w-7xl px-6 mt-6 text-xs text-muted-foreground/70 text-center md:text-left">
          AI insights are informational and not licensed financial advice. Past performance does
          not guarantee future returns.
        </p>
      </footer>
    </div>
  );
}
