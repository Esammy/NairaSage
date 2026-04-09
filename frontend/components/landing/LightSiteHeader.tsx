import Link from "next/link";
import { MarketingAuthNav } from "@/components/landing/MarketingAuthNav";

export function LightSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-sm">
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-ns-primary">
          NairaSage
        </Link>
        <nav
          className="order-3 flex w-full flex-wrap items-center justify-center gap-6 text-sm font-medium text-ink-muted md:order-none md:w-auto"
          aria-label="Main"
        >
          <Link href="/#solutions" className="hover:text-ns-primary transition-colors">
            Solutions
          </Link>
          <Link href="/pricing" className="hover:text-ns-primary transition-colors">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-ns-primary transition-colors">
            About
          </Link>
        </nav>
        <div className="flex items-center justify-end gap-2 md:gap-4">
          <MarketingAuthNav />
        </div>
      </div>
    </header>
  );
}
