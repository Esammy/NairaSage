import Link from "next/link";
import { LightMarketingLayout } from "@/components/landing/LightMarketingLayout";

export default function PrivacyPage() {
  return (
    <LightMarketingLayout>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-ink">
        <h1 className="text-3xl font-bold text-ns-primary">Privacy policy</h1>
        <p className="mt-4 text-sm text-ink-muted leading-relaxed">
          We respect your privacy. This policy describes how NairaSage handles personal data for users in Nigeria and
          elsewhere we operate.
        </p>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-ink-muted">
          <section>
            <h2 className="text-lg font-semibold text-ink">Data we collect</h2>
            <p className="mt-2">
              Account details (such as email), profile and onboarding inputs you choose to provide, usage logs, and
              technical data needed to run the service securely.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-ink">How we use data</h2>
            <p className="mt-2">
              To provide and improve the product, authenticate users, process payments where applicable, prevent abuse,
              and comply with law. AI features may process prompts you submit to generate responses.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-ink">Sharing</h2>
            <p className="mt-2">
              We use infrastructure and payment providers as needed to deliver the service. We do not sell your personal
              data. We may disclose information if required by law or to protect rights and safety.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-ink">Retention and security</h2>
            <p className="mt-2">
              We retain data as long as your account is active and as needed for legitimate business purposes. We apply
              reasonable technical and organizational measures to protect information.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-ink">Your choices</h2>
            <p className="mt-2">
              You may request access, correction, or deletion of your account data where applicable. Contact us using the
              support address shown in the product.
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
