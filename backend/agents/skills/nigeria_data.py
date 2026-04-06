"""Placeholders for NGX / CBN data helpers (wire to integrations later)."""


def format_ngn(amount) -> str:
    return f"NGN {amount:,.2f}" if amount is not None else "NGN —"
