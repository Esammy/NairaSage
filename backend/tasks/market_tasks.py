import logging

from django_rq import job

from integrations.fixer.client import FixerClient

logger = logging.getLogger(__name__)


@job("default")
def refresh_fx_rates():
    client = FixerClient()
    data = client.latest_rates()
    if data:
        logger.info("FX rates refreshed keys=%s", list((data.get("rates") or {}).keys())[:5])
    else:
        logger.warning("FX refresh skipped (no FIXER_API_KEY or error)")


@job("default")
def refresh_all_portfolios():
    from apps.investments.models import PortfolioHolding
    from integrations.ngx.client import NGXClient

    client = NGXClient()
    updated = 0
    for h in PortfolioHolding.objects.select_related("portfolio").filter(
        symbol__isnull=False
    ).exclude(symbol="")[:200]:
        q = client.get_quote(h.symbol)
        if q:
            updated += 1
    logger.info("Portfolio price refresh touched %s quotes", updated)
