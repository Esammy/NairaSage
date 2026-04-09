import Link from "next/link";
import { LightMarketingLayout } from "@/components/landing/LightMarketingLayout";

export default function RiskDisclosurePage() {
  return (
    <LightMarketingLayout>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-ink">
        <h1 className="text-3xl font-bold text-ns-primary">Risk disclosure</h1>
        <p className="mt-6 text-sm leading-relaxed text-ink-muted">
          NairaSage provides financial information for <strong className="text-ink">educational purposes</strong>. It is
          not licensed investment, tax, or legal advice. Markets involve risk, including possible loss of principal.
          Nigerian tax rules, exchange rates, and securities regulations change; any examples or explanations may be
          incomplete or outdated.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          Before making material decisions — investing on NGX, taking on debt, filing with FIRS, or changing your
          financial plan — consult a qualified professional who can review your full situation.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          AI-generated answers can contain errors or omissions. You should verify important facts independently.
        </p>
        <p className="mt-12 text-sm">
          <Link href="/" className="font-semibold text-ns-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </LightMarketingLayout>
  );
}
