/** Maps internal routing keys to user-facing topic labels (no architecture exposure). */
const AGENT_TO_TOPIC: Record<string, string> = {
  accountant: "Spending & cash flow",
  economist: "Economy & markets",
  investment_advisor: "Investing",
  opportunity_scout: "Opportunities",
  tax_advisor: "Tax",
  behavioral_coach: "Money habits",
  debt_manager: "Debt",
  savings_optimizer: "Savings goals",
  risk_assessor: "Risk",
  life_planner: "Life goals",
  education: "Learning",
};

/** Single-key label for the orchestration panel (coach gets its product name). */
export function agentKeyToLabel(key: string): string {
  if (key === "rich_dad_coach") return "NairaSage Coach";
  return AGENT_TO_TOPIC[key] || key.replace(/_/g, " ");
}

export function agentKeysToTopics(keys: string[] | undefined): string[] {
  if (!keys?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    const label = AGENT_TO_TOPIC[k] || k.replace(/_/g, " ");
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}
