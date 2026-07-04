import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-6">
        <Link href="/">
          <BrandMark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          NairaSage provides AI-generated educational content about personal finance. It is not
          licensed investment, tax, or legal advice. You are responsible for your financial decisions.
          By using the service you agree to use it lawfully and not to misuse our systems or data.
        </p>
        <p className="text-muted-foreground mt-4 text-sm">
          <Link href="/" className="text-primary hover:underline">
            Return home
          </Link>
        </p>
      </main>
    </div>
  );
}
