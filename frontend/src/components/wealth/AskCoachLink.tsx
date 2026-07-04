"use client";

import React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AskCoachLink({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const q = `Help me with ${title}`;
  const href = `/wealth/chat?prompt=${encodeURIComponent(q)}`;
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "secondary", size: "sm" }),
        "h-8 gap-1.5 text-xs shrink-0 inline-flex items-center",
        className
      )}
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
      Ask the coach
    </Link>
  );
}
