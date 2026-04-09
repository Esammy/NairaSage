import Link from "next/link";
import { LightMarketingLayout } from "@/components/landing/LightMarketingLayout";

export default function TermsPage() {
  return (
    <LightMarketingLayout>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-ink">
        <h1 className="text-3xl font-bold text-ns-primary">Terms of service</h1>
        <p className="mt-4 text-sm text-ink-muted leading-relaxed">
          Last updated: {new Date().getFullYear()}. These terms govern your use of NairaSage. By creating an account or
          using the product, you agree to them.
        </p>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-ink-muted">
          <section>
            <h2 className="text-lg font-semibold text-ink">Service</h2>
            <p className="mt-2">
              NairaSage provides software and AI-assisted financial information for education and planning. We may
              change or discontinue features with reasonable notice where practicable.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-ink">Not advice</h2>
            <p className="mt-2">
              Outputs are not licensed investment, tax, or legal advice. You are responsible for your own decisions and
              for consulting qualified professionals when appropriate.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-ink">Accounts and billing</h2>
            <p className="mt-2">
              You must provide accurate registration information. Paid plans, when offered, are processed via our
              payment partners; fees and renewal terms are shown at checkout.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-ink">Limitation of liability</h2>
            <p className="mt-2">
              To the fullest extent permitted by law, NairaSage is not liable for indirect or consequential losses
              arising from use of the service. Our aggregate liability is limited to amounts you paid us in the twelve
              months before the claim, where applicable.
            </p>
          </section>
        </div>
        <p className="mt-12 text-sm">
          <Link href="/" className="font-semibold text-ns-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </LightMarketingLayout>
  );
}
