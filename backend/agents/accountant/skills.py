"""Accountant-specific helpers (extend with Mono/ORM queries)."""


def uncategorized_count(user_id: int) -> int:
    from apps.transactions.models import Transaction

    return Transaction.objects.filter(
        account__user_id=user_id, category=""
    ).count()
