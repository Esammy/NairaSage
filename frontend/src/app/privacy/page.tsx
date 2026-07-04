import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";

export const metadata = {
  title: "Privacy Policy — NairaSage",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-6">
        <Link href="/">
          <BrandMark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="mt-1 text-xs text-muted-foreground">Last updated: July 2026</p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          NairaSage helps you learn about money using your own financial picture. We keep this simple:
          we only collect what we need, we don&rsquo;t sell your data, and you can delete it.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. What we collect</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Account details (such as your name and email) and the financial information you choose to
            enter — income, expenses, assets, liabilities, goals, and deals. We do{" "}
            <strong className="text-foreground">not</strong> store bank login credentials; where bank
            connections are used, they are read-only.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. How we use it</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use your information solely to generate your personalized educational insights and to
            operate the service. To produce AI responses, the relevant content may be processed by
            trusted third-party AI providers on our behalf; it is not used to advertise to you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. What we don&rsquo;t do</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We do not sell your personal or financial data, and we do not share it with third parties
            except the service providers needed to run NairaSage or where required by law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Security</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We apply encryption in transit and at rest and follow reasonable safeguards to protect
            your data. No system is perfectly secure, so please use a strong, unique password.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Your rights</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You can request access to, correction of, or deletion of your account data, in line with
            applicable privacy law (including the Nigeria Data Protection Act). Deleting your account
            removes your financial data from the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Questions or requests? Reach us through your account or at hello@nairasage.app.
          </p>
        </section>

        <p className="pt-2 text-sm">
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
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
