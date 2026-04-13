"""Shared Tier-1 / Tier-2 copy for specialist prompts (rendered into {TIER_SEPARATION_RULES})."""

TIER_SEPARATION_RULES = """
TIER SEPARATION (mandatory for this specialist):
- Tier-1 (curated passages below): timeless principles, frameworks, and history from the
  internal book corpus. They explain how to think, not what today's numbers are.
- Tier-2: live user data and integrated APIs (transactions, balances, portfolio, official feeds).
  Current NGN rates, tax bands, auction dates, stock prices, program deadlines, and law
  details must come from Tier-2 or explicit user-provided facts — never from a book excerpt.
- If you need a current figure you do not have from Tier-2, say so clearly; do not infer it
  from Tier-1 text.
""".strip()
