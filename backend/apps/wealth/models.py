"""Kiyosaki Rich Dad domain models.

Encodes the frameworks from Rich Dad's Guide to Investing:
- Personal Financial Statement (Income / Expense / Asset / Liability)
- CASHFLOW Quadrant (E / S / B / I)
- 7 Investor Levels (0 nothing-to-invest .. 6 capitalist)
- 5 Phases of the Rich Dad Investor Plan
- B-I Triangle (8 integrities)
- 10 Investor Controls per deal
"""

from __future__ import annotations

from decimal import Decimal

from django.db import models

from apps.users.models import User


KIYOSAKI_ASSET_TYPES = [
    ("business", "Business (that does not require your presence)"),
    ("real_estate", "Real Estate"),
    ("paper", "Paper Assets (stocks, bonds, mutual funds)"),
    ("commodity", "Commodities (gold, silver, etc.)"),
    ("ip", "Intellectual Property (royalties, patents)"),
    ("cash_eq", "Cash / Cash Equivalents"),
    ("other", "Other"),
]


QUADRANT_ANCHORS = [
    ("E", "Employee"),
    ("S", "Self-Employed"),
    ("B", "Business Owner"),
    ("I", "Investor"),
]


PRIMARY_MOTIVATIONS = [
    ("security", "To feel secure"),
    ("comfort", "To feel comfortable"),
    ("rich", "To be rich"),
    ("wealthy", "To be wealthy (time + money free)"),
]


INVESTOR_LEVEL_CHOICES = [
    (0, "Level 0 - Nothing to Invest"),
    (1, "Level 1 - Borrower"),
    (2, "Level 2 - Saver"),
    (3, "Level 3 - Smart Investor (I-know-nothing / Cynic / Gambler)"),
    (4, "Level 4 - Long-term Investor"),
    (5, "Level 5 - Sophisticated Investor"),
    (6, "Level 6 - Capitalist"),
]


PHASE_CHOICES = [
    (1, "Phase 1 - Are you mentally prepared to be an investor?"),
    (2, "Phase 2 - What kind of investor do you want to become?"),
    (3, "Phase 3 - How do you build a strong business?"),
    (4, "Phase 4 - Who is a sophisticated investor?"),
    (5, "Phase 5 - Giving it back"),
]


class FinancialStatementSnapshot(models.Model):
    """A monthly snapshot of the Kiyosaki Personal Financial Statement.

    Income and Expense sum to an income-statement view; Asset and Liability
    sum to the balance-sheet view. Freedom Ratio = passive_income / expenses.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="financial_snapshots"
    )
    period_month = models.DateField(
        help_text="Always the 1st of the month this snapshot represents"
    )

    # Income column (Kiyosaki splits into 3 types)
    income_active = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Earned income (salary, wages) - Kiyosaki's hardest-taxed income",
    )
    income_passive = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Passive income (real estate cashflow, royalties) - lowest-taxed",
    )
    income_portfolio = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Portfolio income (dividends, interest, capital gains)",
    )

    # Expense column
    expenses_essential = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Needs: food, shelter, transport, insurance",
    )
    expenses_doodad = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Doodads: discretionary wants that Kiyosaki warns against",
    )

    # Asset column (Kiyosaki: things that PUT money in your pocket)
    assets_cashflow = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Assets that generate monthly cashflow (real estate, business)",
    )
    assets_appreciation = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Assets held for capital gains (paper, gold) but not monthly cashflow",
    )

    # Liability column (things that TAKE money from your pocket)
    liabilities_good = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Good debt: debt used to acquire cashflow assets",
    )
    liabilities_bad = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Bad debt: consumer debt, credit cards, doodad loans",
    )

    # Derived metrics
    net_worth = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
    )
    freedom_ratio = models.FloatField(
        default=0.0,
        help_text="Passive income / Monthly expenses. 1.0 = escape the rat race.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_month"]
        unique_together = [("user", "period_month")]
        indexes = [models.Index(fields=["user", "-period_month"])]

    def recalculate(self) -> None:
        """Recompute net_worth and freedom_ratio from column totals."""
        total_assets = (self.assets_cashflow or Decimal("0")) + (
            self.assets_appreciation or Decimal("0")
        )
        total_liabilities = (self.liabilities_good or Decimal("0")) + (
            self.liabilities_bad or Decimal("0")
        )
        self.net_worth = total_assets - total_liabilities

        total_expenses = (self.expenses_essential or Decimal("0")) + (
            self.expenses_doodad or Decimal("0")
        )
        passive = (self.income_passive or Decimal("0")) + (
            self.income_portfolio or Decimal("0")
        )
        if total_expenses > 0:
            self.freedom_ratio = float(passive) / float(total_expenses)
        else:
            self.freedom_ratio = 0.0

    def save(self, *args, **kwargs):
        self.recalculate()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Snapshot:{self.user_id}:{self.period_month}"


class AssetItem(models.Model):
    """An asset under Kiyosaki's strict definition.

    An asset puts money in your pocket (monthly_cashflow > 0 is preferred).
    We still allow zero-cashflow appreciation assets but surface that in UI.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="wealth_assets"
    )
    name = models.CharField(max_length=200)
    kiyosaki_type = models.CharField(max_length=20, choices=KIYOSAKI_ASSET_TYPES)
    market_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    monthly_cashflow = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Monthly cashflow AFTER expenses (net). Negative allowed.",
    )
    acquired_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    # Link back to other apps where the source of truth lives
    linked_portfolio_holding_id = models.IntegerField(null=True, blank=True)
    linked_bank_account_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-monthly_cashflow", "name"]
        indexes = [models.Index(fields=["user", "is_active"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.kiyosaki_type})"


class LiabilityItem(models.Model):
    """A liability under Kiyosaki's definition: takes money out of your pocket."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="wealth_liabilities"
    )
    name = models.CharField(max_length=200)
    is_good_debt = models.BooleanField(
        default=False,
        help_text="True if this debt was taken to acquire a cashflow asset",
    )
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    monthly_payment = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
    )
    interest_rate_pct = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    linked_debt_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-monthly_payment", "name"]
        indexes = [models.Index(fields=["user", "is_active"])]

    def __str__(self) -> str:
        return f"{self.name} (balance={self.balance})"


class QuadrantProfile(models.Model):
    """Where a user earns income from, in Kiyosaki's CASHFLOW Quadrant.

    E = Employee, S = Self-employed, B = Business owner, I = Investor.
    pct_* should sum to ~100.
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="quadrant_profile"
    )
    pct_e = models.FloatField(default=0.0)
    pct_s = models.FloatField(default=0.0)
    pct_b = models.FloatField(default=0.0)
    pct_i = models.FloatField(default=0.0)
    target_pct_b = models.FloatField(default=0.0)
    target_pct_i = models.FloatField(default=0.0)
    target_year = models.IntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def dominant_quadrant(self) -> str:
        pairs = [("E", self.pct_e), ("S", self.pct_s), ("B", self.pct_b), ("I", self.pct_i)]
        pairs.sort(key=lambda p: p[1], reverse=True)
        return pairs[0][0]

    def __str__(self) -> str:
        return f"Quadrant:{self.user_id}:{self.dominant_quadrant()}"


class InvestorLevel(models.Model):
    """User's current level on Kiyosaki's 7-level investor ladder."""

    SUBLEVEL_CHOICES = [
        ("", "-"),
        ("a", "3a - I-know-nothing Investor"),
        ("b", "3b - Cynic"),
        ("c", "3c - Gambler"),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="investor_level"
    )
    current_level = models.IntegerField(choices=INVESTOR_LEVEL_CHOICES, default=0)
    current_sublevel = models.CharField(
        max_length=1, choices=SUBLEVEL_CHOICES, blank=True, default="",
    )
    level_history = models.JSONField(
        default=list,
        help_text="Append-only list of {level, sublevel, changed_at, reason}",
    )
    last_assessed_at = models.DateTimeField(null=True, blank=True)
    last_assessment_score = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Level:{self.user_id}:{self.current_level}{self.current_sublevel}"


class RichDadPhase(models.Model):
    """User's current phase within the 5-phase Rich Dad Investor Plan.

    Guided-but-open: any phase is accessible; this tracks the recommended
    focus and per-phase milestone completion.
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="rich_dad_phase"
    )
    current_phase = models.IntegerField(choices=PHASE_CHOICES, default=1)
    phase_progress = models.JSONField(
        default=dict,
        help_text="Map of phase->{milestones: [{key, done, noted_at}]}",
    )
    phase_notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Phase:{self.user_id}:{self.current_phase}"


class BITriangleScore(models.Model):
    """Kiyosaki's B-I Triangle: 8 integrities of a strong business.

    Each scored 0-100. Populated for users in Phase 3 (B path).
    Three outer layers (Mission, Leadership, Team) plus five inner levels
    (Product, Legal, Systems, Communications, Cash Flow).
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="bi_triangle"
    )
    mission = models.IntegerField(default=0)
    leadership = models.IntegerField(default=0)
    team = models.IntegerField(default=0)
    product = models.IntegerField(default=0)
    legal = models.IntegerField(default=0)
    systems = models.IntegerField(default=0)
    communications = models.IntegerField(default=0)
    cashflow = models.IntegerField(default=0)
    notes = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def overall(self) -> float:
        parts = [
            self.mission, self.leadership, self.team, self.product,
            self.legal, self.systems, self.communications, self.cashflow,
        ]
        return sum(parts) / len(parts)

    def __str__(self) -> str:
        return f"BITriangle:{self.user_id}:{int(self.overall())}"


class Deal(models.Model):
    """A specific investment deal the user is evaluating or holds.

    The 10 Investor Controls are evaluated against this deal.
    """

    DEAL_TYPE = [
        ("real_estate", "Real Estate Deal"),
        ("business", "Business / Private Equity"),
        ("paper", "Paper Asset Position"),
        ("commodity", "Commodity Position"),
        ("ip", "Intellectual Property Deal"),
        ("other", "Other"),
    ]
    STATUS = [
        ("evaluating", "Evaluating"),
        ("active", "Active / Held"),
        ("exited", "Exited"),
        ("passed", "Passed"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="deals"
    )
    title = models.CharField(max_length=200)
    deal_type = models.CharField(max_length=20, choices=DEAL_TYPE)
    status = models.CharField(max_length=20, choices=STATUS, default="evaluating")
    entry_price = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
    )
    projected_monthly_cashflow = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
    )
    projected_roi_pct = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True,
    )
    notes = models.TextField(blank=True)
    linked_asset = models.ForeignKey(
        AssetItem, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="deals",
    )
    linked_opportunity_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class InvestorControlsChecklist(models.Model):
    """The 10 Investor Controls (Kiyosaki) applied to a specific deal.

    Each control is a 0-3 self-rating:
      0 = not yet considered
      1 = weak / risky
      2 = adequate
      3 = strong
    """

    deal = models.OneToOneField(
        Deal, on_delete=models.CASCADE, related_name="controls"
    )
    # 1. Control over yourself (education, emotions)
    control_1_self = models.IntegerField(default=0)
    # 2. Control over income/expense/asset/liability ratios
    control_2_ratios = models.IntegerField(default=0)
    # 3. Control over management of the investment
    control_3_management = models.IntegerField(default=0)
    # 4. Control over taxes
    control_4_taxes = models.IntegerField(default=0)
    # 5. Control over when you buy and when you sell (timing / entry-exit)
    control_5_entry_exit = models.IntegerField(default=0)
    # 6. Control over brokerage transactions
    control_6_brokerage = models.IntegerField(default=0)
    # 7. Control over Entity, Timing, Character of income / use of OPM
    control_7_etc_opm = models.IntegerField(default=0)
    # 8. Control over terms and conditions of the agreement
    control_8_terms = models.IntegerField(default=0)
    # 9. Control over access to information
    control_9_info_access = models.IntegerField(default=0)
    # 10. Control over giving it back (philanthropy / legacy)
    control_10_philanthropy = models.IntegerField(default=0)

    notes = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def total(self) -> int:
        return (
            self.control_1_self + self.control_2_ratios + self.control_3_management
            + self.control_4_taxes + self.control_5_entry_exit
            + self.control_6_brokerage + self.control_7_etc_opm
            + self.control_8_terms + self.control_9_info_access
            + self.control_10_philanthropy
        )

    def max_total(self) -> int:
        return 30

    def pct(self) -> float:
        return round(self.total() / self.max_total() * 100, 1)


class NextAction(models.Model):
    """A single next-action surfaced by the Rich Dad Coach for the user.

    Drives the "One thing to do today" card on the Wealth Cockpit.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="next_actions"
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    phase = models.IntegerField(choices=PHASE_CHOICES, null=True, blank=True)
    target_level = models.IntegerField(
        choices=INVESTOR_LEVEL_CHOICES, null=True, blank=True,
    )
    cta_route = models.CharField(
        max_length=120, blank=True,
        help_text="Frontend route users should be sent to, e.g. /wealth/statement",
    )
    is_done = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    done_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_done", "is_dismissed"])]


class CoachMemory(models.Model):
    """Long-term facts the NairaSage Coach may use across sessions."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="coach_memories"
    )
    kind = models.CharField(max_length=24)
    content = models.TextField()
    source_session = models.CharField(max_length=64, blank=True, default="")
    source_turn_id = models.IntegerField(null=True, blank=True)
    confidence = models.FloatField(default=0.7)
    content_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_forgotten = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_forgotten", "created_at"]),
        ]


class ActionProposal(models.Model):
    """Pending chat-proposed wealth mutation; confirmed only via explicit API."""

    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_CANCELLED = "cancelled"
    STATUS_EXPIRED = "expired"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "pending"),
        (STATUS_CONFIRMED, "confirmed"),
        (STATUS_CANCELLED, "cancelled"),
        (STATUS_EXPIRED, "expired"),
        (STATUS_FAILED, "failed"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="action_proposals"
    )
    tool = models.CharField(max_length=64)
    args = models.JSONField(default=dict)
    human_summary = models.TextField(blank=True)
    diff_preview = models.JSONField(default=dict)
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    session_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "created_at"]),
        ]


class ActionAudit(models.Model):
    """Record of a confirmed (or failed) wealth action from chat."""

    STATUS_CONFIRMED = "confirmed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_CONFIRMED, "confirmed"),
        (STATUS_FAILED, "failed"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="action_audits"
    )
    proposal = models.ForeignKey(
        ActionProposal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audits",
    )
    tool = models.CharField(max_length=64)
    args = models.JSONField(default=dict)
    before_json = models.JSONField(null=True, blank=True)
    after_json = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"])]
