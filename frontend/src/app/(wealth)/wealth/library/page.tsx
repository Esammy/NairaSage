"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CITATION_DISCLOSURE } from "@/lib/wealth";
import { ExplainChip } from "@/components/wealth/ExplainChip";
import { AskCoachLink } from "@/components/wealth/AskCoachLink";

type Lesson = {
  id: string;
  title: string;
  framework: "Quadrant" | "Levels" | "Phases" | "B-I Triangle" | "Controls" | "Statement" | "Mindset";
  phase?: number;
  summary: string;
  prompt: string;
};

const LESSONS: Lesson[] = [
  {
    id: "rat-race",
    title: "The Rat Race - why salary alone never wins",
    framework: "Statement",
    phase: 1,
    summary: "Kiyosaki shows why active income + rising expenses trap most people. The escape is passive income >= expenses.",
    prompt: "Explain Kiyosaki's rat race using my own financial statement. Show me the exact gap to the 1.0 Freedom Ratio.",
  },
  {
    id: "assets-vs-liabs",
    title: "Assets vs. liabilities the Rich Dad way",
    framework: "Statement",
    phase: 1,
    summary: "Forget accounting definitions. Assets put money into your pocket. Liabilities take it out.",
    prompt: "Walk through my asset and liability rows and tell me which ones Rich Dad would call doodads.",
  },
  {
    id: "quadrant-shift",
    title: "Shifting from E/S to B/I",
    framework: "Quadrant",
    phase: 2,
    summary: "The right side of the CASHFLOW Quadrant is where tax and time leverage live.",
    prompt: "Based on my current E/S/B/I income mix, what is the next concrete step to shift one percentage point into B or I this quarter?",
  },
  {
    id: "levels-climb",
    title: "Climbing the 7 Investor Levels",
    framework: "Levels",
    summary: "Borrowers, savers, smart-but-passive, long-term, sophisticated, capitalist.",
    prompt: "Grade me on the 7 Investor Levels with evidence from my statement, and tell me what Level {N+1} would require.",
  },
  {
    id: "5-phases",
    title: "The 5 Phases of becoming rich",
    framework: "Phases",
    summary: "Mental preparation, pick your plan, build the business, become sophisticated, give back.",
    prompt: "Which Phase am I truly in, with proof from my milestones? What should I do this week?",
  },
  {
    id: "bi-triangle-mission",
    title: "Mission comes before money (B-I Triangle)",
    framework: "B-I Triangle",
    phase: 3,
    summary: "Kiyosaki's triangle says Mission > Leadership > Team, and those three hold Product/Legal/Systems/Communications/Cash Flow.",
    prompt: "Help me draft a one-sentence business mission I can defend to investors.",
  },
  {
    id: "10-controls",
    title: "The 10 Investor Controls in plain English",
    framework: "Controls",
    phase: 4,
    summary: "The weakest control is the real risk. Score every deal before you commit capital.",
    prompt: "Walk me through all 10 Investor Controls using my latest deal as the example.",
  },
  {
    id: "opm-ethics",
    title: "Using Other People's Money (OPM) responsibly",
    framework: "Controls",
    phase: 4,
    summary: "OPM amplifies returns but also amplifies mistakes. Rich Dad says: never borrow for liabilities.",
    prompt: "Give me 3 rules for using OPM responsibly, tied to my current investor level.",
  },
  {
    id: "mindset-fear",
    title: "Facing money fears (Phase 1)",
    framework: "Mindset",
    phase: 1,
    summary: "Most people never start because fear looks like caution.",
    prompt: "Help me name my top 3 money fears and draft a 10-minute exercise to reduce each one.",
  },
  {
    id: "give-back",
    title: "Phase 5 - Giving it back",
    framework: "Phases",
    phase: 5,
    summary: "Philanthropy, legacy, mentorship. The final Kiyosaki phase.",
    prompt: "Draft a philanthropy plan I can run on a 1% of cashflow basis starting today.",
  },
];

const SCENARIOS: Array<{ id: string; title: string; framing: string; prompt: string }> = [
  {
    id: "cashflow-101",
    title: "CASHFLOW 101 scenario",
    framing: "You are a Nigerian mid-level employee with N400k/month salary, N350k expenses, and one old car loan.",
    prompt: "Run a CASHFLOW-style round on me: set the starting statement (salary N400k, expenses N350k, car loan N3m), then offer a small deal with trade-offs. Grade my decision.",
  },
  {
    id: "real-estate-deal",
    title: "First rental deal",
    framing: "A 2-bed flat in Lekki: N35m, rent N2m/year, 80% mortgage offered at 22% interest, 5-year term.",
    prompt: "Walk me through this rental deal using Kiyosaki's 10 Investor Controls. Decide if I should pass, negotiate, or move.",
  },
  {
    id: "side-business",
    title: "Side business that could scale",
    framing: "You run a part-time food delivery service. Revenue N200k/month, costs N120k, 10 hrs/week.",
    prompt: "Score my side business on the B-I Triangle and tell me the weakest integrity to fix first.",
  },
  {
    id: "tax-structure",
    title: "Tax entity choice",
    framing: "You are about to incorporate - sole proprietorship vs LLC vs CAC-registered Ltd.",
    prompt: "Compare the three structures through Kiyosaki's Control 4 (taxes) and Control 7 (ETC+OPM) lenses for Nigeria.",
  },
];

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return LESSONS;
    const lc = q.toLowerCase();
    return LESSONS.filter(
      (l) => l.title.toLowerCase().includes(lc) || l.summary.toLowerCase().includes(lc) || l.framework.toLowerCase().includes(lc),
    );
  }, [q]);

  const coachHref = (prompt: string) =>
    `/wealth/chat?prompt=${encodeURIComponent(prompt)}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            NairaSage Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Short lessons and practice scenarios. Each card opens the NairaSage Coach with context
            prefilled. Frameworks are cited as educational references.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExplainChip prompt="Explain how to use the Library and pick a lesson for my level." />
          <AskCoachLink title="Library lessons" />
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search lessons (e.g. quadrant, doodad, controls)..."
          className="pl-9"
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" /> Lessons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((l) => (
            <Card key={l.id} className="hover:border-primary/60 transition">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{l.framework}</Badge>
                  {l.phase && <Badge variant="outline">Phase {l.phase}</Badge>}
                </div>
                <CardTitle className="text-base mt-2">{l.title}</CardTitle>
                <CardDescription className="text-xs">{l.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={coachHref(l.prompt)}>
                  <Button size="sm" variant="outline" className="w-full">
                    <Sparkles className="h-4 w-4" />
                    <span className="ml-1">Open with coach</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No lessons match that search.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> CASHFLOW-style scenarios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SCENARIOS.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription className="text-xs">{s.framing}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={coachHref(s.prompt)}>
                  <Button size="sm" className="w-full">
                    Play this scenario
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="pt-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-3xl">{CITATION_DISCLOSURE}</p>
      </footer>
    </div>
  );
}
