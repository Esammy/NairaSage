import logging
from datetime import date, datetime
from decimal import Decimal

from django_rq import job
from django.utils.dateparse import parse_date

from apps.accounts.models import BankAccount
from apps.transactions.models import Transaction
from integrations.mono.client import MonoClient

logger = logging.getLogger(__name__)


def _parse_tx_date(raw: str) -> date:
    if not raw:
        return datetime.utcnow().date()
    if isinstance(raw, str) and len(raw) >= 10:
        d = parse_date(raw[:10])
        if d:
            return d
    return datetime.utcnow().date()


@job("default")
def sync_account_transactions(account_id: int):
    account = BankAccount.objects.get(id=account_id)
    client = MonoClient()
    try:
        txns = client.get_transactions(account.mono_account_id, limit=100)
        created = 0
        for t in txns:
            mono_id = t.get("_id") or t.get("id")
            if not mono_id:
                continue
            amount_raw = t.get("amount", 0) or 0
            amount_minor = float(amount_raw)
            amount = Decimal(str(abs(amount_minor) / 100.0))
            bal_raw = t.get("balance", 0) or 0
            balance = Decimal(str(float(bal_raw) / 100.0))
            tx_type = "credit" if amount_minor > 0 else "debit"
            _, was_created = Transaction.objects.update_or_create(
                mono_id=str(mono_id),
                defaults={
                    "account": account,
                    "amount": amount,
                    "type": tx_type,
                    "description": (t.get("narration") or t.get("text") or "")[:500],
                    "date": _parse_tx_date(str(t.get("date", ""))),
                    "balance": balance,
                },
            )
            if was_created:
                created += 1
        if created > 0:
            categorize_new_transactions.delay(account.user_id)
        logger.info("Synced %s new transactions for account %s", created, account_id)
    except Exception as e:  # noqa: BLE001
        logger.exception("Sync failed for account %s: %s", account_id, e)


@job("default")
def categorize_new_transactions(user_id: int):
    from agents.accountant.agent import AccountantAgent

    agent = AccountantAgent(user_id=user_id)
    agent.run({"query": "Categorize all uncategorized transactions."})


@job("default")
def sync_all_active_accounts():
    for acc in BankAccount.objects.filter(is_active=True):
        sync_account_transactions.delay(acc.id)
