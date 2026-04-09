import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-faint/15 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-bold text-ns-primary">
            NairaSage
          </Link>
          <nav className="flex gap-4 text-xs font-semibold text-ink-muted">
            <Link href="/terms" className="hover:text-ns-primary">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-ns-primary">
              Privacy
            </Link>
            <Link href="/risk-disclosure" className="hover:text-ns-primary">
              Risk
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
