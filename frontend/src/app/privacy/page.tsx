import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-6">
        <Link href="/">
          <BrandMark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-invert prose-sm">
        <h1 className="text-3xl font-bold text-foreground not-prose">Privacy Policy</h1>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed not-prose">
          NairaSage processes your financial data to provide educational wealth insights. We use
          read-only bank connections where available, do not store bank login credentials, and apply
          encryption in transit and at rest. Contact us to request access, correction, or deletion of
          your account data in line with applicable privacy law (including NDPA in Nigeria).
        </p>
        <p className="text-muted-foreground mt-4 text-sm not-prose">
          <Link href="/" className="text-primary hover:underline">
            Return home
          </Link>
        </p>
      </main>
    </div>
  );
}
