"use client";

import React from "react";
import Link from "next/link";
import { User, Bell, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExplainChip } from "@/components/wealth/ExplainChip";

const tiles = [
  {
    title: "Profile",
    description: "Name, email, and account details (dashboard).",
    href: "/dashboard/settings",
    icon: User,
  },
  {
    title: "Notifications",
    description: "Alerts and reminders (dashboard).",
    href: "/dashboard/settings",
    icon: Bell,
  },
  {
    title: "Coach memory",
    description: "Review or forget what the coach remembers about you.",
    href: "/wealth/memory",
    icon: Brain,
  },
];

export default function WealthSettingsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Wealth settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quick links for your profile, notifications, and coach memory.
          </p>
        </div>
        <ExplainChip prompt="Explain the Wealth settings page and where to change my profile." />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="block group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader className="pb-2">
                <t.icon className="h-8 w-8 text-primary mb-2" aria-hidden />
                <CardTitle className="text-base">{t.title}</CardTitle>
                <CardDescription className="text-xs">{t.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-primary group-hover:underline">Open</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
