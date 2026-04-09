"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, DollarSign, Megaphone, type LucideIcon } from "lucide-react";

type RightSidebarProps = {
  expanded: boolean;
};

export function RightSidebar({ expanded }: RightSidebarProps) {
  return (
    <motion.div
      className="fixed right-0 top-0 bottom-0 z-40 hidden bg-surface/90 backdrop-blur-xl border-l border-ink-faint/20 lg:flex flex-col pt-20 items-end"
      initial={{ width: "80px" }}
      animate={{ width: expanded ? "320px" : "80px" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex flex-col h-full overflow-hidden w-[320px]">
        {/* Compact Default Icons (Right Aligned) */}
        <div className="px-5 flex flex-col gap-6 mt-4 items-end absolute right-0">
          <SidebarIcon icon={Activity} bg="bg-[#FEE2E2] text-[#ef4444]" />
          <SidebarIcon icon={DollarSign} bg="bg-[#D1FAE5] text-[#10b981]" />
          <SidebarIcon icon={Megaphone} bg="bg-[#FEF3C7] text-[#f59e0b]" />
        </div>

        {/* Expanded Content */}
        <motion.div
          animate={{ opacity: expanded ? 1 : 0, pointerEvents: expanded ? "auto" : "none" }}
          transition={{ duration: 0.2 }}
          className="px-6 flex flex-col h-full pt-4 absolute top-20 left-0 right-0 w-[320px]"
        >
          <div className="flex-1 flex flex-col gap-8">
            
            {/* Widget 1 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                 <SidebarIcon icon={Activity} bg="bg-[#FEE2E2] text-[#ef4444]" />
                 <div>
                   <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">NGX Volatility</p>
                   <p className="text-xl font-bold text-ink">12.4% <span className="text-sm font-medium text-ink-muted ml-1">(Elevated)</span></p>
                 </div>
              </div>
              <div className="flex flex-col gap-2 text-sm font-medium">
                <div className="flex justify-between">
                  <span className="text-ink-muted">AIRTELAFRI</span>
                  <span className="text-[#ef4444]">-2.1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">DANGCEM</span>
                  <span className="text-[#10b981]">+0.8%</span>
                </div>
              </div>
            </div>

            {/* Widget 2 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                 <SidebarIcon icon={DollarSign} bg="bg-[#D1FAE5] text-[#10b981]" />
                 <div>
                   <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">USD/NGN Rates</p>
                   <p className="text-xl font-bold text-ink">₦1,595 / $1</p>
                 </div>
              </div>
              <div className="flex flex-col text-xs text-ink-muted">
                <p>Parallel Market Avg</p>
                <p>Spread: <span className="font-semibold text-ink">₦12.00 (Tightening)</span></p>
              </div>
            </div>

            {/* Widget 3 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                 <SidebarIcon icon={Megaphone} bg="bg-[#FEF3C7] text-[#f59e0b]" />
                 <div>
                   <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Grant Alerts</p>
                   <p className="text-xl font-bold text-ink">2 Active Matches</p>
                 </div>
              </div>
              <div className="bg-ink-faint/10 rounded-md p-3 border-l-2 border-[#f59e0b]">
                <p className="text-xs font-semibold text-ink">Agro-Export Fund Q4</p>
                <p className="text-[10px] text-ink-muted mt-1">Eligibility: 94%</p>
              </div>
            </div>

          </div>

          <div className="pb-8">
            <button className="w-full py-3 rounded-lg bg-ink-faint/10 text-ink font-bold text-sm tracking-wider uppercase hover:bg-ink-faint/20 transition-colors">
              New Analysis
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SidebarIcon({ icon: Icon, bg }: { icon: LucideIcon; bg: string }) {
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${bg}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
}
