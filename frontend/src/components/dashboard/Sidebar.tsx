"use client";

import React from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  LayoutDashboard,
  Wallet,
  LineChart,
  Target,
  Briefcase,
  Receipt,
  Scale,
  GraduationCap,
  Settings,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Chat", href: "/dashboard/chat", icon: MessageCircle },
  { name: "Accounts", href: "/dashboard/accounts", icon: Wallet },
  { name: "Investments", href: "/dashboard/investments", icon: LineChart },
  { name: "Goals", href: "/dashboard/goals", icon: Target },
  { name: "Opportunities", href: "/dashboard/opportunities", icon: Briefcase },
  { name: "Tax", href: "/dashboard/tax", icon: Receipt },
  { name: "Debt", href: "/dashboard/debt", icon: Scale },
  { name: "Learn", href: "/dashboard/learn", icon: GraduationCap },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar glass-panel">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/">
          <BrandMark />
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? "text-primary text-glow" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-8">
          <Link
            href="/dashboard/settings"
            className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <Settings className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
