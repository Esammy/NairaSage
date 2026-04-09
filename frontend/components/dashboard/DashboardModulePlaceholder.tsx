import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function DashboardModulePlaceholder({ title, description, children }: Props) {
  return (
    <div className="rounded-2xl border border-ink-faint/15 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ns-primary">{title}</h1>
      <p className="mt-3 text-sm text-ink-muted leading-relaxed max-w-2xl">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/chat"
          className="inline-flex rounded-lg bg-ns-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light"
        >
          Ask the coordinator
        </Link>
        <Link href="/dashboard" className="inline-flex rounded-lg border border-ink-faint/25 px-4 py-2 text-sm font-semibold text-ink hover:bg-surface">
          Back to overview
        </Link>
      </div>
      {children ? <div className="mt-8 border-t border-ink-faint/10 pt-6">{children}</div> : null}
    </div>
  );
}
