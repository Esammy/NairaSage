"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import { DashboardModulePlaceholder } from "@/components/dashboard/DashboardModulePlaceholder";

export default function SettingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.get("/auth/me/");
      return res.data as Record<string, unknown>;
    },
  });

  return (
    <DashboardModulePlaceholder
      title="Settings & profile"
      description="Account basics from your JWT profile. Deeper preferences and notifications will expand here."
    >
      {isLoading ? <p className="text-sm text-ink-muted">Loading profile…</p> : null}
      {error ? (
        <p className="text-sm text-red-600">Could not load profile.</p>
      ) : null}
      {data ? (
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-ink-muted">Email</dt>
            <dd className="font-medium text-ink">{String(data.email ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Username</dt>
            <dd className="font-medium text-ink">{String(data.username ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Tier</dt>
            <dd className="font-medium text-ink">{String(data.tier ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Email verified</dt>
            <dd className="font-medium text-ink">{data.is_email_verified ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Subscription</dt>
            <dd className="font-medium text-ink">{String(data.subscription_status ?? "—")}</dd>
          </div>
        </dl>
      ) : null}
      <p className="mt-6 text-xs text-ink-muted">
        <Link href="/pricing" className="font-semibold text-ns-primary hover:underline">
          Manage plan / billing
        </Link>
      </p>
    </DashboardModulePlaceholder>
  );
}
