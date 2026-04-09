import Link from "next/link";
import { LightMarketingLayout } from "@/components/landing/LightMarketingLayout";

export default function AboutPage() {
  return (
    <LightMarketingLayout>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">About NairaSage</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ns-primary sm:text-4xl">
          Institutional intelligence for personal wealth decisions
        </h1>
        <p className="mt-6 text-ink-muted leading-relaxed">
          NairaSage combines a coordinator agent with specialist financial agents to help users make better decisions
          across spending, tax, investing, risk, and long-term planning in the Nigerian market.
        </p>
        <p className="mt-4 text-ink-muted leading-relaxed">
          The current MVP focuses on a practical command center: onboarding, a financial overview dashboard, and a chat
          interface that streams coordinator responses in real time.
        </p>
        <Link
          href="/login"
          className="mt-10 inline-flex font-semibold text-ns-primary underline-offset-4 hover:underline"
        >
          Continue to Secure Login
        </Link>
      </main>
    </LightMarketingLayout>
  );
}
