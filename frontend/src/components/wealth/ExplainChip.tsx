"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWealthCoach } from "@/lib/wealth-coach";

export function ExplainChip({ prompt }: { prompt: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 text-xs shrink-0 border-dashed"
      onClick={() => openWealthCoach(prompt)}
    >
      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      Explain this page
    </Button>
  );
}
