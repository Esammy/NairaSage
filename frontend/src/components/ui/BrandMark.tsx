import React from "react";
import { Sparkles } from "lucide-react";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 relative shadow-lg shadow-gold-500/20">
        <Sparkles className="w-5 h-5 text-primary" />
        <div className="absolute inset-0 bg-primary/20 blur-md rounded-xl -z-10" />
      </div>
      <span className="font-bold text-xl tracking-tight text-foreground">
        Naira<span className="text-primary">Sage</span>
      </span>
    </div>
  );
}
