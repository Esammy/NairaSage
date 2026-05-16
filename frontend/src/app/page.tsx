"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Shield,
  TrendingUp,
  Sparkles,
  Brain,
  CheckCircle2,
  BarChart3,
  Clock,
  LineChart,
  Target,
  Lock,
  LayoutDashboard,
  MessageCircle,
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
    <div className="bg-background min-h-screen selection:bg-gold-500/30 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <BrandMark />
          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
            <a href="#agents" className="hover:text-primary transition-colors">Your AI Team</a>
            <a href="#security" className="hover:text-primary transition-colors">Security</a>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            {session === "loading" ? (
              <div className="h-10 w-40 rounded-full bg-muted/60 animate-pulse" aria-hidden />
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
                  className="sm:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/40"
                  aria-label="Open coach"
                >
                  <MessageCircle className="h-5 w-5" />
                </Link>
                <Link href="/wealth">
                  <Button className="bg-primary text-primary-foreground hover:bg-gold-600 shadow-lg shadow-gold-500/20 h-10 px-5 sm:px-6 rounded-full font-semibold gap-2">
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
                  <Button className="bg-primary text-primary-foreground hover:bg-gold-600 shadow-lg shadow-gold-500/20 h-10 px-6 rounded-full font-semibold">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-primary via-emerald-500/20 to-transparent blur-[120px] rounded-full" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-6 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-8 backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            Designed exclusively for Nigerian Professionals
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter text-foreground mb-8 leading-tight">
            Stop letting inflation <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-600">steal your wealth.</span>
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            NairaSage is your always-on financial co-pilot. We coordinate 11 specialized AI agents to optimize your spending, scout high-yield investments, and actively outpace Naira devaluation—24 hours a day.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            {session === "loading" ? (
              <div className="h-14 w-72 max-w-full rounded-full bg-muted/60 animate-pulse" aria-hidden />
            ) : isLoggedIn ? (
              <Link href="/wealth">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-primary hover:bg-gold-600 shadow-xl shadow-gold-500/25 rounded-full transition-transform hover:scale-105 gap-2"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Open your Wealth Cockpit
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-primary hover:bg-gold-600 shadow-xl shadow-gold-500/25 rounded-full transition-transform hover:scale-105"
                >
                  Start Building Wealth <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
          <p className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" /> Bank-grade security. Read-only access.
          </p>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 bg-secondary/30 relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Why exactly do you need an AI Co-Pilot?</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">The gap between knowing what to do financially and actually doing it is the #1 reason smart people stay broke.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-24 h-24 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Silent Value Erosion</h3>
              <p className="text-muted-foreground leading-relaxed">
                Leaving idle cash in standard Naira accounts while inflation runs above 25% is financial sabotage. You need a system that auto-sweeps surplus cash into high-yield instruments immediately.
              </p>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Brain className="w-24 h-24 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Emotional Blindspots</h3>
              <p className="text-muted-foreground leading-relaxed">
                FOMO investing, panic selling, and impulse lifestyle creep destroy wealth. NairaSage analyzes your behavior and intervenes *before* you make a costly financial mistake.
              </p>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock className="w-24 h-24 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Missed Opportunities</h3>
              <p className="text-muted-foreground leading-relaxed">
                You don't have time to monitor FGN Bonds, T-Bill rates, or new grants all day. Our Opportunity Scout never sleeps, hunting the internet to bring you personalized, high ROI alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution: "Meet Your AI Team" */}
      <section id="agents" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                Not a chatbot. <br/>
                <span className="text-primary">An entire financial firm in your pocket.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                NairaSage doesn't just give generic advice. By securely connecting to your bank via open banking, we build your unique <strong>Financial DNA</strong> and bring together accounting, investing, tax, behaviour, and other disciplines so you can put every Kobo to better use.
              </p>
              
              <ul className="space-y-6">
                {[
                  { title: "The Accountant", desc: "Auto-categorizes every transaction, spots subscription creep, and flags anomalies instantly." },
                  { title: "The Investment Advisor", desc: "Builds a bespoke portfolio across NGX, mutual funds, and US stocks tailored strictly to your risk profile." },
                  { title: "The Opportunity Scout", desc: "Scours the web 24/7 for grants, government programs, arbitrage windows, and new high-yield products." },
                  { title: "The Tax Planner", desc: "Proactively identifies deductible expenses and warns you of FIRS deadlines so you never overpay." }
                ].map((agent, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{agent.title}</h4>
                      <p className="text-muted-foreground">{agent.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Interactive Mockup Visual */}
            <div className="lg:w-1/2 w-full">
              <div className="relative rounded-2xl p-2 bg-gradient-to-tr from-primary/20 to-transparent border border-primary/20 shadow-2xl shadow-gold-500/20">
                <div className="rounded-xl bg-[#0a0a0a] border border-border p-6 shadow-inner h-[550px] flex flex-col relative overflow-hidden">
                  
                  {/* Mock Chat Interface */}
                  <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
                    <div className="bg-primary/20 p-2 rounded-lg"><Bot className="w-5 h-5 text-primary" /></div>
                    <div>
                      <div className="font-bold text-sm">NairaSage</div>
                      <div className="text-xs text-emerald-500">Online • Active</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="bg-secondary p-4 rounded-tl-sm rounded-2xl w-[85%] text-sm text-secondary-foreground border border-border/50">
                      I noticed your current account balance hit ₦850k today. You have an under-allocated emergency fund. I've found an 18.5% yield Money Market Fund. Should I instruct the execution protocol to map ₦300k there?
                    </div>
                    <div className="flex justify-start gap-2 mt-2 pl-2">
                       <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3"/> Accountant</span>
                       <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3"/> Scout</span>
                    </div>

                    <div className="flex justify-end mt-4">
                      <div className="bg-primary text-primary-foreground p-3 rounded-tr-sm rounded-2xl text-sm font-medium shadow-md">
                        Yes, execute that move. Keep remainder in cash.
                      </div>
                    </div>
                    
                    <div className="bg-secondary p-4 rounded-tl-sm rounded-2xl w-[85%] text-sm text-secondary-foreground border border-border/50 mt-4">
                      Done. ₦300k safely moved. Your projected annual interest on this new allocation is ₦55,500. Next, your Tax Advisor wants to review your Q3 remittances.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section id="security" className="py-24 bg-background border-t border-border/50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-6">Uncompromising Security Architecture</h2>
          <p className="text-lg text-muted-foreground mb-10">
            NairaSage is built with NDPA-compliant privacy frameworks. We use official open-banking integrations like Mono to achieve secure, read-only access to your data. We never store your bank login credentials, and our AI layers process data using strict, anonymized context limits.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-border">
              <Lock className="w-4 h-4 text-emerald-500" /> <span>Read-Only API Access</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-border">
              <Lock className="w-4 h-4 text-emerald-500" /> <span>Bank-Level 256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-border">
              <Lock className="w-4 h-4 text-emerald-500" /> <span>Zero Credential Storage</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative mx-auto max-w-3xl px-6 text-center z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight">Ready to rewrite your <br/> Financial DNA?</h2>
          <p className="text-xl text-muted-foreground mb-10 min-h-[3.5rem] flex items-center justify-center">
            {session === "loading" ? (
              <span className="block h-7 w-full max-w-xl rounded-md bg-muted/50 animate-pulse" aria-hidden />
            ) : isLoggedIn ? (
              "You're signed in — open the app to review your money, goals, and next best moves."
            ) : (
              "Join the elite circle of professionals utilizing AI to automate and scale their wealth creation in Nigeria."
            )}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            {session === "loading" ? (
              <div className="h-14 w-64 max-w-full rounded-full bg-muted/60 animate-pulse" aria-hidden />
            ) : isLoggedIn ? (
              <Link href="/wealth">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg font-bold bg-primary hover:bg-gold-600 shadow-xl shadow-gold-500/25 rounded-full w-full sm:w-auto gap-2"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Continue to Wealth OS
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg font-bold bg-primary hover:bg-gold-600 shadow-xl shadow-gold-500/25 rounded-full w-full sm:w-auto"
                >
                  Create Free Account
                </Button>
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              {session === "loading"
                ? ""
                : isLoggedIn
                  ? "Same bank-grade security when you're logged in."
                  : "No credit card required for standard tier."}
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background py-12 text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="ml-2">© {new Date().getFullYear()} NairaSage Tech.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Security Details</a>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 mt-8 text-xs opacity-60 text-center md:text-left">
          DISCLAIMER: AI responses and insights are generated for informational purposes and should not be considered licensed financial or investment advice. SEC-registered brokers execute trades via our API partners. Past performance of generated strategies does not guarantee future returns.
        </div>
      </footer>
    </div>
  );
}
