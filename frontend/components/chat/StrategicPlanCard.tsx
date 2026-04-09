"use client";

import { Sparkles, Hexagon } from "lucide-react";

export function StrategicPlanCard() {
  return (
    <div className="bg-white border-2 border-brand/5 shadow-card rounded-2xl rounded-tl-sm p-8 w-full relative overflow-hidden group hover:shadow-panel transition-all">
      {/* Decorative background element */}
      <div className="absolute -right-12 -top-12 text-brand/5 rotate-12 group-hover:rotate-45 transition-transform duration-700 pointer-events-none">
        <Hexagon className="w-48 h-48" strokeWidth={1} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-[10px] font-bold text-brand uppercase tracking-widest">Coordinator Strategic Plan</div>
      </div>

      <p className="text-ink text-lg leading-relaxed mb-8">
        MTN Nigeria&apos;s proposed dividend yield remains attractive at current valuations, however, your portfolio risk profile suggests a slight pivot. Here is the recommended Sovereign rebalancing:
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-surface p-4 rounded-xl">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Current Exposure</div>
          <div className="text-2xl font-bold text-ink">₦18,400,000</div>
        </div>
        <div className="bg-surface p-4 rounded-xl">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Projected Dividend</div>
          <div className="text-2xl font-bold text-ink">₦1,240,000</div>
        </div>
      </div>

      <ul className="flex flex-col gap-4 mb-8">
        <li className="flex gap-3 text-ink-muted leading-relaxed text-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
          <p><span className="font-bold text-ink">Reinvest 60%</span> into Zenith Bank to capture the upcoming liquidity cycle which aligns with our Q4 stability target.</p>
        </li>
        <li className="flex gap-3 text-ink-muted leading-relaxed text-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
          <p><span className="font-bold text-ink">Hold 40%</span> in NGN Liquidity Vault to await the USD/NGN arbitrage window opening next week.</p>
        </li>
      </ul>

      <div className="flex gap-4">
        <button className="bg-brand text-white font-medium px-6 py-3 rounded-lg hover:bg-brand-light transition-colors shadow-md">
          Execute Rebalance
        </button>
        <button className="bg-surface text-ink font-medium px-6 py-3 rounded-lg hover:bg-ink-faint/20 transition-colors">
          Deep Dive Metrics
        </button>
      </div>
    </div>
  );
}
