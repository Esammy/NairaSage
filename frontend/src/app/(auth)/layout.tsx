import React from "react";
import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Form Side */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-28 relative z-10 backdrop-blur-md bg-background/50">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Link href="/">
            <BrandMark className="mb-10" />
          </Link>
          {children}
        </div>
      </div>
      
      {/* Right Image/Brand Side */}
      <div className="hidden lg:block relative w-1/2" style={{ background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)' }}>
        <div className="absolute inset-0 bg-primary/5 pattern-dots" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">Master Your Financial DNA</h2>
          <p className="text-lg text-muted-foreground">Join the elite platform turning every Nigerian into a sophisticated investor through AI.</p>
        </div>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,1)]" />
      </div>
    </div>
  );
}
