import React from "react";

function NairaGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Geometric N with dual crossbars — naira-inspired */}
      <path
        d="M8 26V6h3.2l9.6 14.2V6H24v20h-3.2L11.2 11.8V26H8z"
        fill="currentColor"
      />
      <path
        d="M6 13.5h20M6 18.5h20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

export function BrandMark({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "lg" | "hero";
}) {
  const markSize =
    size === "hero" ? "h-12 w-12" : size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const iconSize =
    size === "hero" ? "w-7 h-7" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const textSize =
    size === "hero" ? "text-3xl sm:text-4xl" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <div
        className={`${markSize} flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary`}
      >
        <NairaGlyph className={iconSize} />
      </div>
      <span className={`font-display font-semibold tracking-tight text-foreground ${textSize}`}>
        Naira<span className="text-primary">Sage</span>
      </span>
    </div>
  );
}
