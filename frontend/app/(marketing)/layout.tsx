import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "NairaSage | AI-Powered Wealth for Nigeria",
    template: "%s | NairaSage",
  },
  description:
    "Multi-agent financial co-pilot for Nigeria: spending, goals, tax context, investments, and coordinator chat.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
