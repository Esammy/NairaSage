import Link from "next/link";
import { LightMarketingLayout } from "@/components/landing/LightMarketingLayout";
import { PricingTiers } from "@/components/pricing/PricingTiers";

export default function PricingPage() {
  return (
    <LightMarketingLayout>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="text-center text-3xl font-bold tracking-tight text-ns-primary sm:text-4xl">
          Invest in your future
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-ink-muted leading-relaxed">
          Start free and upgrade when you need coordinated intelligence across your portfolio, spending, and
          opportunities. Paid tiers are billed via Paystack when configured.
        </p>
        <PricingTiers />
        <p className="mt-10 text-center text-sm text-ink-muted">
          <Link href="/" className="font-semibold text-ns-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </LightMarketingLayout>
  );
}
