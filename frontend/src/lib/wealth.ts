// Shared types and helpers for the NairaSage Wealth Cockpit frontend.

/** Shown near coach chat and library (educational reference disclaimer). */
export const CITATION_DISCLOSURE =
  "References frameworks from Robert Kiyosaki's Rich Dad series for educational purposes. Not affiliated with or endorsed by the Rich Dad Company.";

export type KiyosakiAssetType =
  | "business"
  | "real_estate"
  | "paper"
  | "commodity"
  | "ip"
  | "cash_eq"
  | "other";

export type PrimaryMotivation = "security" | "comfort" | "rich" | "wealthy";
export type QuadrantKey = "E" | "S" | "B" | "I";
export type PhaseNumber = 1 | 2 | 3 | 4 | 5;

export type FinancialStatementSnapshot = {
  id: number;
  period_month: string;
  income_active: string;
  income_passive: string;
  income_portfolio: string;
  expenses_essential: string;
  expenses_doodad: string;
  assets_cashflow: string;
  assets_appreciation: string;
  liabilities_good: string;
  liabilities_bad: string;
  net_worth: string;
  freedom_ratio: number;
  total_income: string;
  total_expenses: string;
  total_assets: string;
  total_liabilities: string;
  passive_income: string;
};

export type AssetItem = {
  id: number;
  name: string;
  kiyosaki_type: KiyosakiAssetType;
  market_value: string;
  monthly_cashflow: string;
  notes: string;
  is_active: boolean;
  acquired_on?: string | null;
};

export type LiabilityItem = {
  id: number;
  name: string;
  is_good_debt: boolean;
  balance: string;
  monthly_payment: string;
  interest_rate_pct?: string | null;
  notes: string;
  is_active: boolean;
};

export type QuadrantProfile = {
  pct_e: number;
  pct_s: number;
  pct_b: number;
  pct_i: number;
  target_pct_b: number;
  target_pct_i: number;
  target_year?: number | null;
  dominant?: QuadrantKey;
};

export type InvestorLevel = {
  current_level: number;
  current_level_label?: string;
  current_sublevel: string;
  last_assessed_at?: string | null;
  level_history: Array<{
    level: number;
    sublevel: string;
    changed_at: string;
    reason: string;
  }>;
};

export type RichDadPhase = {
  current_phase: PhaseNumber;
  current_phase_label?: string;
  phase_progress: Record<string, { milestones?: Array<{ key: string; done: boolean; noted_at?: string }> }>;
  phase_notes: string;
};

export type BITriangleScore = {
  mission: number;
  leadership: number;
  team: number;
  product: number;
  legal: number;
  systems: number;
  communications: number;
  cashflow: number;
  overall: number;
};

export type Deal = {
  id: number;
  title: string;
  deal_type: "real_estate" | "business" | "paper" | "commodity" | "ip" | "other";
  status: "evaluating" | "active" | "exited" | "passed";
  entry_price: string;
  projected_monthly_cashflow: string;
  projected_roi_pct?: string | null;
  notes: string;
  controls?: InvestorControls;
};

export type InvestorControls = {
  control_1_self: number;
  control_2_ratios: number;
  control_3_management: number;
  control_4_taxes: number;
  control_5_entry_exit: number;
  control_6_brokerage: number;
  control_7_etc_opm: number;
  control_8_terms: number;
  control_9_info_access: number;
  control_10_philanthropy: number;
  total: number;
  pct: number;
};

export type NextAction = {
  id: number;
  title: string;
  body: string;
  phase?: PhaseNumber | null;
  target_level?: number | null;
  cta_route: string;
  is_done: boolean;
  is_dismissed: boolean;
  created_at: string;
};

export type CockpitTrend = {
  freedom_ratio_delta: number;
  prior_period_month: string;
};

export type WealthCockpit = {
  snapshot: FinancialStatementSnapshot;
  quadrant: QuadrantProfile;
  investor_level: InvestorLevel;
  phase: RichDadPhase;
  next_action: NextAction | null;
  milestones_catalog: Record<string, Array<{ key: string; title: string }>>;
  cockpit_trend?: CockpitTrend | null;
  snapshot_updated_at?: string | null;
  period_month?: string | null;
  data_completeness?: number;
};

export type CoachMemoryRow = {
  id: number;
  kind: string;
  content: string;
  confidence: number;
  created_at: string;
  expires_at?: string | null;
  is_forgotten: boolean;
};

export type ActionProposalPayload = {
  id: number;
  tool: string;
  args: Record<string, unknown>;
  human_summary: string;
  diff_preview: Record<string, unknown>;
};

// Thin wrapper over /api/django/*. Returns parsed JSON or null on failure.
export async function wealthFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const normalized = path.replace(/^\//, "");
  const url = `/api/django/${normalized}`;
  try {
    const res = await fetch(url, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      console.warn(`wealthFetch failed ${url}`, res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`wealthFetch errored ${url}`, e);
    return null;
  }
}

export function formatNaira(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null) return "NGN 0";
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (!isFinite(n)) return "NGN 0";
  return `NGN ${Math.round(n).toLocaleString()}`;
}

export const INVESTOR_LEVELS: Array<{ level: number; name: string; blurb: string }> = [
  { level: 0, name: "Nothing to Invest", blurb: "Starting line - build a monthly statement first." },
  { level: 1, name: "Borrower", blurb: "Often spends more than earned. Priority: kill bad debt." },
  { level: 2, name: "Saver", blurb: "Builds cash but inflation erodes it. Priority: first cashflow asset." },
  { level: 3, name: "Smart Investor", blurb: "Owns paper assets but still passive. Priority: diversify." },
  { level: 4, name: "Long-term Investor", blurb: "Planned, patient, diversified. Priority: exercise 10 Controls." },
  { level: 5, name: "Sophisticated Investor", blurb: "Deal-by-deal analysis, multiple asset classes." },
  { level: 6, name: "Capitalist", blurb: "Freedom Ratio >= 1.0. Time + money free." },
];

export const PHASES: Array<{ id: PhaseNumber; title: string; blurb: string }> = [
  { id: 1, title: "Mental preparation", blurb: "Write down WHY; face money fears; pay yourself first." },
  { id: 2, title: "Pick your kind of investor", blurb: "Choose plan: secure, comfortable, or rich. Pick active / passive / sophisticated." },
  { id: 3, title: "Build a strong business", blurb: "Score the B-I Triangle: Mission, Leadership, Team, Product, Legal, Systems, Communications, Cash Flow." },
  { id: 4, title: "Become a sophisticated investor", blurb: "Source deals; exercise the 10 Investor Controls." },
  { id: 5, title: "Give it back", blurb: "Philanthropy, legacy, mentor others." },
];
