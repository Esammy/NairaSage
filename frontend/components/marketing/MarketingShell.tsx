import Link from "next/link";

type MarketingShellProps = {
  children: React.ReactNode;
  showFooterMark?: boolean;
};

export function MarketingShell({ children, showFooterMark = true }: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-marketing-bg text-white antialiased flex flex-col">
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <Link
          href="/"
          className="block text-xl sm:text-2xl font-bold text-white tracking-tight w-fit"
        >
          NairaSage
        </Link>
        <nav
          className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium"
          aria-label="Primary"
        >
          <Link
            href="/about"
            className="text-marketing-accent hover:text-marketing-accent-hover transition-colors"
          >
            Philosophy
          </Link>
          <Link
            href="/pricing"
            className="text-marketing-accent hover:text-marketing-accent-hover transition-colors"
          >
            Tiers
          </Link>
          <Link
            href="/login"
            className="text-marketing-accent hover:text-marketing-accent-hover transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="shrink-0 rounded-full border border-white/25 px-4 py-2 text-marketing-accent hover:border-white/45 hover:text-marketing-accent-hover transition-colors"
          >
            Enter Command
          </Link>
        </nav>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-28">{children}</div>

      {showFooterMark ? (
        <Link
          href="/"
          className="fixed bottom-6 left-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black text-sm font-bold text-white hover:border-white/50 transition-colors"
          aria-label="NairaSage home"
        >
          N
        </Link>
      ) : null}
    </div>
  );
}
