"""Seed ONE demo account with a realistic Kiyosaki financial statement.

Fills a single user's Wealth Cockpit so the dashboard shows real numbers
(Freedom Ratio, mini statement, net worth, investor level) instead of zeros —
ideal for the demo video.

SAFE BY DESIGN: it targets one account by email and is NOT wired into signup,
so new/other users are never affected. Re-running it just refreshes that one
account's current-month statement.

    python manage.py seed_demo_data --email you@example.com
    python manage.py seed_demo_data --email you@example.com --month 2026-07
"""

from __future__ import annotations

import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

# Realistic monthly figures (NGN) for a Lagos professional mid-journey: earning
# well, some passive income, real assets, but not yet financially free.
FIGURES = {
    "income_active": Decimal("850000"),
    "income_passive": Decimal("180000"),
    "income_portfolio": Decimal("45000"),
    "expenses_essential": Decimal("520000"),
    "expenses_doodad": Decimal("140000"),
    "assets_cashflow": Decimal("12500000"),
    "assets_appreciation": Decimal("3200000"),
    "liabilities_good": Decimal("4000000"),
    "liabilities_bad": Decimal("650000"),
}


class Command(BaseCommand):
    help = "Seed one demo account (by email) with a realistic financial statement."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--email", required=True, help="Email of the account to seed")
        parser.add_argument(
            "--month", default=None, help="Statement month as YYYY-MM (default: current month)"
        )

    def handle(self, *args, **options) -> None:
        from apps.wealth.models import FinancialStatementSnapshot

        User = get_user_model()
        email = (options["email"] or "").strip()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(
                f"No user with email {email!r}. Sign up in the app first, then run this."
            )

        if options["month"]:
            try:
                year, month = options["month"].split("-")
                period = datetime.date(int(year), int(month), 1)
            except Exception as exc:  # noqa: BLE001
                raise CommandError("--month must be YYYY-MM, e.g. 2026-07") from exc
        else:
            period = datetime.date.today().replace(day=1)

        snapshot, created = FinancialStatementSnapshot.objects.get_or_create(
            user=user, period_month=period
        )
        for field, value in FIGURES.items():
            setattr(snapshot, field, value)
        snapshot.save()  # full save() -> recalculate() sets net_worth + freedom_ratio
        snapshot.refresh_from_db()

        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Updated'} statement for {email} "
                f"({period:%B %Y})."
            )
        )
        self.stdout.write(f"  Net worth:     NGN {snapshot.net_worth:,.0f}")
        self.stdout.write(f"  Freedom Ratio: {snapshot.freedom_ratio:.2f}")
        self.stdout.write(
            "  The Wealth Cockpit will now show a populated statement and gauge."
        )
