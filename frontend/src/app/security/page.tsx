import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { Lock } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-6">
        <Link href="/">
          <BrandMark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground">Security</h1>
        <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <Lock className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden />
            Read-only API access to linked accounts where supported
          </li>
          <li className="flex gap-3">
            <Lock className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden />
            Encryption in transit (TLS) and at rest for stored data
          </li>
          <li className="flex gap-3">
            <Lock className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden />
            No storage of bank login credentials
          </li>
          <li className="flex gap-3">
            <Lock className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden />
            Automatic sign-out after 30 minutes of inactivity
          </li>
        </ul>
        <p className="text-muted-foreground mt-8 text-sm">
          <Link href="/" className="text-primary hover:underline">
            Return home
          </Link>
        </p>
      </main>
    </div>
  );
}
