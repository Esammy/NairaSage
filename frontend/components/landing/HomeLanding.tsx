import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Brain,
  Building2,
  Calculator,
  Check,
  LineChart,
  Play,
  Shield,
  TrendingUp,
} from "lucide-react";
import { HomeLoggedInStrip } from "@/components/landing/HomeLoggedInStrip";
import { LightSiteFooter } from "@/components/landing/LightSiteFooter";
import { LightSiteHeader } from "@/components/landing/LightSiteHeader";

export function HomeLanding() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <LightSiteHeader />
      <HomeLoggedInStrip />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="inline-block rounded-full bg-ns-hero-badge px-3 py-1 text-xs font-bold uppercase tracking-wider text-ns-primary">
              AI-first wealth management
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-ns-primary sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
              The AI that turns ordinary Nigerians into{" "}
              <span className="font-serif italic text-ns-muted-blue">sophisticated investors.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-muted leading-relaxed">
              Master your money with an elite suite of AI agents built for the Nigerian economic landscape. From NGX
              stocks to FIRS tax optimization, your board is always on.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-ns-primary px-8 py-3.5 text-base font-semibold text-white shadow-card hover:bg-brand-light transition-colors"
              >
                Get Started Free
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 text-base font-semibold text-ns-primary hover:opacity-80"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ns-primary">
                  <Play className="h-4 w-4 fill-ns-primary text-ns-primary" aria-hidden />
                </span>
                Watch the Sage in action
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="relative aspect-[4/3] rounded-2xl bg-zinc-900 shadow-panel ring-1 ring-black/10">
              <div className="absolute inset-3 rounded-xl bg-zinc-800/80" />
              <div className="absolute bottom-6 left-4 right-4 sm:left-8 sm:right-auto sm:w-[min(100%,320px)]">
                <div className="rounded-xl border border-white/10 bg-white p-4 shadow-xl">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-ns-hero-badge" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold text-ns-primary">Sage Investment</p>
                      <p className="mt-1 text-sm text-ink-muted leading-snug">
                        NGX arbitrage window: modelled <span className="font-semibold text-ns-primary">12.5%</span>{" "}
                        annualized edge on your watchlist. Review before the bell.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-ns-soft py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">
            Trusted by 10,000+ Nigerian professionals
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60 grayscale">
            <span className="text-lg font-bold tracking-tight">KPMG</span>
            <span className="text-lg font-bold tracking-tight">Paystack</span>
            <span className="text-lg font-bold tracking-tight">Interswitch</span>
            <span className="text-lg font-bold tracking-tight">Andela</span>
          </div>
        </div>
      </section>

      <section id="solutions" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="relative mx-auto h-[340px] w-full max-w-md lg:max-w-lg">
            <div className="absolute left-0 top-0 w-[85%] rounded-xl border border-black/10 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold text-ink-muted">Risk appetite</p>
              <div className="mt-3 h-2 rounded-full bg-ns-soft">
                <div className="h-full w-[60%] rounded-full bg-brand-accent" />
              </div>
              <p className="mt-2 text-xs text-ink-muted">Moderate growth</p>
            </div>
            <div className="absolute right-0 top-24 w-[78%] rounded-xl border border-black/10 bg-ns-primary p-4 text-white shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Planning stage</p>
              <p className="mt-1 text-2xl font-bold">94% profile maturity</p>
            </div>
            <div className="absolute bottom-0 left-8 w-[82%] rounded-xl border border-blue-200 bg-sky-50 p-4 shadow-card">
              <p className="text-xs font-bold text-sky-900">Unified cashflow analysis</p>
              <p className="mt-2 text-xs text-sky-800/80">Income, spend, and goals in one live view.</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-ns-primary sm:text-4xl">Your Financial DNA</h2>
            <p className="mt-5 text-lg text-ink-muted leading-relaxed">
              NairaSage builds a living model of how you earn, spend, and decide under pressure, then improves it with
              every transaction and conversation.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ns-hero-badge text-ns-primary">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                <span className="text-ink-muted">Real-time goal mapping across NGN and FX exposure</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ns-hero-badge text-ns-primary">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                <span className="text-ink-muted">Behavioral overrides that catch panic moves before they cost you</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-ns-primary sm:text-4xl">A team of 12 AI agents</h2>
          <p className="mt-4 text-lg text-ink-muted">
            Like a board of directors for your money, specialists debate, coordinate, and deliver one clear plan.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <AgentCard
            icon={<Calculator className="h-5 w-5 text-emerald-700" />}
            iconBg="bg-emerald-100"
            title="The Accountant"
            desc="Automated tracking of every Naira, reconciliations, and month-end clarity."
          />
          <AgentCard
            icon={<LineChart className="h-5 w-5 text-sky-700" />}
            iconBg="bg-sky-100"
            title="The Economist"
            desc="Inflation, CBN policy, and USD/NGN context translated into your portfolio."
          />
          <AgentCard
            icon={<TrendingUp className="h-5 w-5 text-amber-700" />}
            iconBg="bg-amber-100"
            title="Investment Advisor"
            desc="NGX screens, T-bills, and diversified paths matched to your risk profile."
          />
          <AgentCard
            icon={<Brain className="h-5 w-5 text-zinc-600" />}
            iconBg="bg-zinc-200"
            title="Behavioral Coach"
            desc="Nudges that reduce impulse trades and keep long-term discipline on track."
          />
        </div>
        <p className="mt-8 text-center text-sm text-ink-muted">
          Plus Opportunity Scout, Tax Advisor, Debt Manager, and more working behind the scenes.
        </p>
      </section>

      <section className="bg-ns-primary py-20 text-white sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Built for the Nigerian ecosystem</h2>
            <p className="mt-4 text-lg text-white/80 leading-relaxed">
              Deep integrations and local rules so recommendations are not generic—they are actionable in Lagos, Abuja,
              and Port Harcourt.
            </p>
            <ul className="mt-10 space-y-6">
              <EcosystemItem
                icon={<Building2 className="h-6 w-6" />}
                title="Mono (Open banking)"
                desc="Connect 40+ Nigerian banks and fintechs with consent-first linking."
              />
              <EcosystemItem
                icon={<BarChart3 className="h-6 w-6" />}
                title="NGX real-time feed"
                desc="Live context on listings you care about, not yesterday's PDFs."
              />
              <EcosystemItem
                icon={<Shield className="h-6 w-6" />}
                title="FIRS compliance"
                desc="PAYE estimates, deadlines, and deduction hints aligned to Nigerian tax practice."
              />
            </ul>
          </div>
          <div className="relative flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/5 p-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">Lagos</p>
            <div className="mt-6 flex flex-1 items-end justify-center gap-1 opacity-90">
              {[40, 65, 55, 80, 50, 90, 45, 70].map((h, i) => (
                <div
                  key={i}
                  className="w-4 rounded-t bg-white/30 sm:w-5"
                  style={{ height: `${h}px` }}
                  aria-hidden
                />
              ))}
            </div>
            <p className="mt-6 font-serif text-2xl italic text-white/90">Safe work</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-ns-primary sm:text-4xl">Invest in your future</h2>
          <p className="mt-4 text-lg text-ink-muted">Choose the tier that matches how hard you want your money to work.</p>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <PricingCard
            name="Free"
            price="N0"
            period="/mo"
            cta="Get for Free"
            href="/register"
            highlight={false}
            features={["Basic tracking", "Weekly summaries", "Education snippets"]}
          />
          <PricingCard
            name="Pro"
            price="N2,500"
            period="/mo"
            cta="Choose Pro"
            href="/register"
            highlight
            badge="Most popular"
            features={["4 specialist agents", "Real-time alerts", "Advanced tax planning"]}
          />
          <PricingCard
            name="Elite"
            price="N5,000"
            period="/mo"
            cta="Go Elite"
            href="/register"
            highlight={false}
            features={["Full board of 12 agents", "Concierge onboarding", "Multi-currency (USD/GBP)"]}
          />
        </div>
      </section>

      <section className="bg-ns-soft py-20 sm:py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-black/5 bg-white px-6 py-12 text-center shadow-card sm:px-10 sm:py-14">
          <h2 className="text-2xl font-bold text-ns-primary sm:text-3xl">Ready to reach the Sovereign Tier?</h2>
          <p className="mt-4 text-ink-muted leading-relaxed">
            Join 10,000+ Nigerians who have stopped guessing and started commanding a coordinated financial system.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center rounded-lg bg-ns-primary px-8 py-3.5 font-semibold text-white shadow-sm hover:bg-brand-light transition-colors sm:w-auto"
            >
              Get Started Now
            </Link>
            <Link
              href="/login?next=%2Fdashboard%2Fchat"
              className="inline-flex w-full items-center justify-center rounded-lg border-2 border-ns-primary px-8 py-3.5 font-semibold text-ns-primary hover:bg-ns-primary/5 transition-colors sm:w-auto"
            >
              Talk to the coordinator
            </Link>
          </div>
        </div>
      </section>

      <LightSiteFooter />
    </div>
  );
}

function AgentCard({
  icon,
  iconBg,
  title,
  desc,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-6 shadow-card">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <h3 className="mt-4 text-lg font-bold text-ns-primary">{title}</h3>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function EcosystemItem({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">{icon}</span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm text-white/75 leading-relaxed">{desc}</p>
      </div>
    </li>
  );
}

function PricingCard({
  name,
  price,
  period,
  cta,
  href,
  highlight,
  badge,
  features,
}: {
  name: string;
  price: string;
  period: string;
  cta: string;
  href: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 ${
        highlight
          ? "border-ns-primary bg-white shadow-panel ring-2 ring-ns-primary/20"
          : "border-black/10 bg-white shadow-card"
      }`}
    >
      {badge ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {badge}
        </span>
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted">{name}</p>
      <p className="mt-3 text-4xl font-bold text-ns-primary">
        {price}
        <span className="text-lg font-semibold text-ink-muted">{period}</span>
      </p>
      <ul className="mt-8 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-ink-muted">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" strokeWidth={3} aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-8 inline-flex w-full items-center justify-center rounded-lg py-3.5 text-center text-sm font-semibold transition-colors ${
          highlight
            ? "bg-ns-primary text-white hover:bg-brand-light"
            : "border-2 border-ns-primary text-ns-primary hover:bg-ns-primary/5"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

