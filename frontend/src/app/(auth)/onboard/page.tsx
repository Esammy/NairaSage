"use client";

// Wealth Discovery - onboarding that seeds wealth cockpit models for a user.
// Replaces the legacy 3-step DNA flow. 10 questions total, grouped into
// 5 short cards. On finish, POSTs to /api/django/wealth/onboarding/ and
// redirects to /wealth.

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Briefcase,
  Wallet,
  Building2,
  TrendingUp,
  Heart,
  Home,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CITATION_DISCLOSURE } from "@/lib/wealth";

type Motivation = "security" | "comfort" | "rich" | "wealthy";
type Quadrant = "E" | "S" | "B" | "I";
type Phase = 1 | 2 | 3 | 4 | 5;

type Answers = {
  motivation?: Motivation;
  quadrant?: Quadrant;
  owns_business: boolean;
  has_cashflow_assets: boolean;
  has_bad_debt: boolean;
  has_paper_assets: boolean;
  savings_months?: "0" | "1-3" | "3-6" | "6+";
  target_quadrant?: Quadrant;
  commitment_years?: 1 | 3 | 5 | 10;
  phase_self_rating?: Phase;
};

const MOTIVATIONS: { id: Motivation; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "security", title: "To feel secure", desc: "Predictable paycheck, low stress about bills.", icon: Home },
  { id: "comfort", title: "To feel comfortable", desc: "A good lifestyle, some extras, little luxury.", icon: Heart },
  { id: "rich", title: "To be rich", desc: "More than enough money - but still trading time for it.", icon: TrendingUp },
  { id: "wealthy", title: "To be wealthy", desc: "Passive income exceeds expenses - time AND money free.", icon: Sparkles },
];

const QUADRANTS: { id: Quadrant; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "E", title: "Employee (E)", desc: "I earn mostly from a salary / wages.", icon: Briefcase },
  { id: "S", title: "Self-employed (S)", desc: "I earn by selling my own time or skill.", icon: Wallet },
  { id: "B", title: "Business owner (B)", desc: "I own a system that earns whether I show up or not.", icon: Building2 },
  { id: "I", title: "Investor (I)", desc: "My money works for me through cashflow assets.", icon: TrendingUp },
];

function deriveLevel(a: Answers): number {
  // Simple heuristic aligned with Kiyosaki's 7 levels. Reassessed nightly once
  // the user logs their first full financial statement.
  if (a.has_cashflow_assets && a.owns_business) return 5;
  if (a.has_cashflow_assets) return 4;
  if (a.has_paper_assets) return 3;
  if (!a.has_bad_debt && (a.savings_months === "3-6" || a.savings_months === "6+")) return 2;
  if (a.has_bad_debt) return 1;
  return 0;
}

function derivePhase(a: Answers): Phase {
  if (a.phase_self_rating) return a.phase_self_rating;
  if (a.motivation === "wealthy") return 2;
  if (a.owns_business) return 3;
  return 1;
}

function deriveSplit(a: Answers): Record<string, number> {
  const src = a.quadrant ?? "E";
  const baseline = { E: 0, S: 0, B: 0, I: 0 } as Record<Quadrant, number>;
  baseline[src] = 100;
  const target = a.target_quadrant ?? "I";
  return {
    ...baseline,
    target_B: target === "B" ? 50 : 20,
    target_I: target === "I" ? 60 : 40,
  };
}

export default function RichDadDiscoveryPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    owns_business: false,
    has_cashflow_assets: false,
    has_bad_debt: false,
    has_paper_assets: false,
  });

  const totalSteps = 5;
  const progress = useMemo(() => Math.round((step / totalSteps) * 100), [step]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const canAdvance = useMemo(() => {
    switch (step) {
      case 1:
        return !!answers.motivation;
      case 2:
        return !!answers.quadrant;
      case 3:
        return !!answers.savings_months;
      case 4:
        return !!answers.target_quadrant && !!answers.commitment_years;
      case 5:
        return !!answers.phase_self_rating;
      default:
        return false;
    }
  }, [step, answers]);

  async function submit() {
    setLoading(true);
    const initial_level = deriveLevel(answers);
    const phase_anchor = derivePhase(answers);
    const quadrant_split = deriveSplit(answers);
    const payload = {
      primary_motivation: answers.motivation,
      quadrant_anchor: answers.quadrant,
      phase_anchor,
      initial_level,
      quadrant_split,
      answers,
    };
    try {
      const res = await fetch("/api/django/wealth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("Wealth onboarding POST failed", res.status);
      }
    } catch (e) {
      console.error("Wealth onboarding request errored", e);
    } finally {
      setLoading(false);
      setSuccess(true);
      window.setTimeout(() => router.push("/wealth"), 1800);
    }
  }

  if (success) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto w-full pt-24 text-center px-6">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" aria-hidden />
        <h2 className="text-2xl font-bold text-foreground">You are all set</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your Wealth Cockpit is ready. Opening it now…
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-6" aria-hidden />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto w-full pt-10">
      <div className="flex items-center gap-2 mb-2 justify-center">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Wealth Discovery</h2>
      </div>
      <p className="text-center text-sm text-muted-foreground mb-8">
        Ten questions. We use educational frameworks from Robert Kiyosaki&apos;s books (cited
        references) to place you on the CASHFLOW Quadrant and the 7 Investor Levels, then guide you
        from there.
      </p>

      <div className="w-full bg-secondary rounded-full h-2 mb-8 overflow-hidden">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">
            Why do you want to be rich? Pick the closest.
          </h3>
          <p className="text-sm text-muted-foreground">
            In Kiyosaki&apos;s book there are four answers. Only one - wealthy -
            buys you time AND money.
          </p>
          <div className="grid gap-3">
            {MOTIVATIONS.map((opt) => {
              const Icon = opt.icon;
              const active = answers.motivation === opt.id;
              return (
                <Card
                  key={opt.id}
                  onClick={() => set("motivation", opt.id)}
                  className={`cursor-pointer transition-all border ${
                    active
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Icon className={`w-6 h-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1">
                      <div className="font-semibold">{opt.title}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                    {active && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">
            Where does most of your income come from today?
          </h3>
          <p className="text-sm text-muted-foreground">
            The CASHFLOW Quadrant: Employee, Self-employed, Business owner, or
            Investor.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUADRANTS.map((opt) => {
              const Icon = opt.icon;
              const active = answers.quadrant === opt.id;
              return (
                <Card
                  key={opt.id}
                  onClick={() => set("quadrant", opt.id)}
                  className={`cursor-pointer transition-all border ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <CardContent className="p-4">
                    <Icon className={`w-6 h-6 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="font-semibold">{opt.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Quick financial snapshot</h3>
          <p className="text-sm text-muted-foreground">
            Four yes/no questions. Be honest - this places you on the 7-level
            Investor ladder.
          </p>

          <YesNo
            label="Do you own any cashflow asset (rental unit, dividend stock, royalties, a business that pays you without your presence)?"
            value={answers.has_cashflow_assets}
            onChange={(v) => set("has_cashflow_assets", v)}
          />
          <YesNo
            label="Do you own paper assets only (stocks, bonds, mutual funds, ETFs) but nothing that pays monthly cashflow?"
            value={answers.has_paper_assets}
            onChange={(v) => set("has_paper_assets", v)}
          />
          <YesNo
            label="Do you own or operate a business (formal or informal)?"
            value={answers.owns_business}
            onChange={(v) => set("owns_business", v)}
          />
          <YesNo
            label="Do you have high-interest bad debt - credit cards, BNPL, informal loans for consumption?"
            value={answers.has_bad_debt}
            onChange={(v) => set("has_bad_debt", v)}
          />

          <div>
            <div className="text-sm font-medium mb-2">
              How many months of expenses do you have in savings / cash?
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["0", "1-3", "3-6", "6+"] as const).map((opt) => {
                const active = answers.savings_months === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set("savings_months", opt)}
                    className={`h-10 rounded-md border text-sm font-medium transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Pick your target quadrant</h3>
          <p className="text-sm text-muted-foreground">
            Which side of the CASHFLOW Quadrant do you want to shift TO in the
            next few years? B and I are the right-side quadrants with the most
            leverage.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUADRANTS.map((opt) => {
              const Icon = opt.icon;
              const active = answers.target_quadrant === opt.id;
              return (
                <Card
                  key={opt.id}
                  onClick={() => set("target_quadrant", opt.id)}
                  className={`cursor-pointer transition-all border ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <CardContent className="p-4">
                    <Icon className={`w-6 h-6 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="font-semibold">{opt.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <div className="text-sm font-medium mb-2">
              How many years are you willing to commit to the plan?
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([1, 3, 5, 10] as const).map((opt) => {
                const active = answers.commitment_years === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set("commitment_years", opt)}
                    className={`h-10 rounded-md border text-sm font-medium transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {opt} yr{opt > 1 ? "s" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Where are you on the journey?</h3>
          <p className="text-sm text-muted-foreground">
            The five-phase investor plan (cited reference) has distinct milestones. Pick the one
            that best describes where you are today. You can switch later.
          </p>
          <div className="space-y-2">
            {[
              { id: 1, title: "Phase 1 - Mental preparation", desc: "I want to build the mindset first." },
              { id: 2, title: "Phase 2 - Pick my kind of investor", desc: "I know I want in; I have not decided how." },
              { id: 3, title: "Phase 3 - Build a strong business", desc: "I am building or plan to build a business (B-I Triangle)." },
              { id: 4, title: "Phase 4 - Become sophisticated", desc: "I am sizing up deals with real money already." },
              { id: 5, title: "Phase 5 - Give it back", desc: "I have escaped the rat race; I focus on legacy." },
            ].map((p) => {
              const active = answers.phase_self_rating === (p.id as Phase);
              return (
                <Card
                  key={p.id}
                  onClick={() => set("phase_self_rating", p.id as Phase)}
                  className={`cursor-pointer transition-all border ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.desc}</div>
                    </div>
                    {active && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mt-4">
            <p className="text-xs text-primary font-medium leading-relaxed">
              We will place you at Investor Level {deriveLevel(answers)} and
              Phase {derivePhase(answers)}. Your Wealth Cockpit will guide you
              to the next level from there.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={loading}
            className="h-11 px-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <div className="flex-1" />
        {step < totalSteps ? (
          <Button
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
            className="h-11 px-5 bg-primary text-primary-foreground"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            disabled={!canAdvance || loading}
            onClick={submit}
            className="h-11 px-5 bg-primary text-primary-foreground"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Enter my Wealth Cockpit <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-8 max-w-lg mx-auto leading-relaxed">
        {CITATION_DISCLOSURE}
      </p>
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium mb-2">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: true, label: "Yes" },
          { id: false, label: "No" },
        ].map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={String(opt.id)}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`h-10 rounded-md border text-sm font-medium transition-all ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-secondary/50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
