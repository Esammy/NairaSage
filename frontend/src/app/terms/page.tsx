import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";

export const metadata = {
  title: "Terms of Service — NairaSage",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-6">
        <Link href="/">
          <BrandMark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="mt-1 text-xs text-muted-foreground">Last updated: July 2026</p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Welcome to NairaSage. By creating an account or using the service, you agree to these terms.
          Please read them — they are intentionally short and plain.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Educational purpose only</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            NairaSage provides AI-generated educational content about personal finance and money
            habits. It is <strong className="text-foreground">not</strong> licensed investment, tax,
            accounting, or legal advice, and it is not a recommendation to buy or sell any asset. You
            are solely responsible for your own financial decisions and should consult a qualified
            professional before acting.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            2. Independence &amp; intellectual property
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            NairaSage references personal-finance frameworks and terminology popularized by Robert
            Kiyosaki and the &ldquo;Rich Dad&rdquo; series — such as the CASHFLOW&reg; Quadrant,
            investor levels, and the B-I Triangle — for the purpose of education, commentary, and
            analysis. NairaSage is an independent product and is{" "}
            <strong className="text-foreground">
              not affiliated with, authorized by, endorsed by, or sponsored by
            </strong>{" "}
            Robert Kiyosaki, the Rich Dad Company, or any of their affiliates. All book titles,
            trademarks, and referenced works are the property of their respective owners, and are used
            nominatively only to describe the concepts we teach. NairaSage does not reproduce or
            distribute those works.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. Acceptable use</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Use the service lawfully. Do not attempt to disrupt, reverse-engineer, or abuse our
            systems, and do not submit unlawful content or another person&rsquo;s data without their
            permission. You are responsible for keeping your login credentials secure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. No warranty</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The service is provided &ldquo;as is&rdquo; without warranties of any kind. AI output can
            be inaccurate or incomplete; verify anything important before relying on it. To the extent
            permitted by law, NairaSage is not liable for losses arising from your use of the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Changes &amp; contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We may update these terms from time to time; continued use means you accept the changes.
            Questions? Reach us through your account or at hello@nairasage.app.
          </p>
        </section>

        <p className="pt-2 text-sm">
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          <span className="text-muted-foreground"> · </span>
          <Link href="/" className="text-primary hover:underline">
            Return home
          </Link>
        </p>
      </main>
    </div>
  );
}
