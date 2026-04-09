import Link from "next/link";

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-wider text-ns-primary">{title}</p>
      <ul className="mt-4 space-y-2 text-sm text-ink-muted">
        {links.map((l) => (
          <li key={l.label}>
            {l.href.includes("#") ? (
              <a href={l.href} className="hover:text-ns-primary transition-colors">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="hover:text-ns-primary transition-colors">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LightSiteFooter() {
  return (
    <footer className="border-t border-black/5 bg-ns-soft">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-ns-primary">NairaSage</p>
            <p className="mt-3 text-sm text-ink-muted leading-relaxed">
              Institutional-grade AI for personal wealth, built for Nigeria first.
            </p>
            <p className="mt-6 text-xs text-ink-muted">© {new Date().getFullYear()} NairaSage. All rights reserved.</p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { label: "Solutions", href: "/#solutions" },
              { label: "Pricing", href: "/pricing" },
              { label: "Investment", href: "/#solutions" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "About", href: "/about" },
              { label: "Contact Support", href: "/about" },
              { label: "FAQ", href: "/about" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Risk disclosure", href: "/risk-disclosure" },
            ]}
          />
        </div>
        <div className="mt-10 flex justify-end gap-4 text-sm font-semibold text-ink-muted">
          <a href="https://twitter.com" className="hover:text-ns-primary" aria-label="X">
            X
          </a>
          <a href="https://linkedin.com" className="hover:text-ns-primary" aria-label="LinkedIn">
            in
          </a>
        </div>
      </div>
    </footer>
  );
}
