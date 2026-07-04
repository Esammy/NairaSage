"use client";

import React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onExtend: () => void;
  onSignOut: () => void;
};

export function IdleSessionWarning({ open, onExtend, onSignOut }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-background/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
    >
      <div className="w-full max-w-md rounded-xl border border-amber-500/30 bg-card shadow-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500/15 p-2 shrink-0">
            <Clock className="h-5 w-5 text-amber-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="idle-warning-title" className="text-lg font-semibold text-foreground">
              Still there?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              You have been inactive for a while. For your security, you will be signed out in about
              5 minutes unless you choose to stay signed in.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onSignOut}>
            Sign out now
          </Button>
          <Button type="button" onClick={onExtend} className="bg-primary text-primary-foreground hover:bg-gold-600">
            Stay signed in
          </Button>
        </div>
      </div>
    </div>
  );
}
