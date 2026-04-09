"""NGX / market data helpers for agent prompts (optional API keys)."""

from typing import Any, Dict, Optional

from integrations.ngx.client import NGXClient


def format_ngn(amount) -> str:
    return f"NGN {amount:,.2f}" if amount is not None else "NGN —"


def get_ngx_quote(symbol: str) -> Optional[Dict[str, Any]]:
    """Live quote when NGX_API_KEY (or compatible URL) is configured."""
    return NGXClient().get_quote(symbol)
