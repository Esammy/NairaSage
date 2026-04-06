"""Lightweight behavioral signal helpers."""


def flag_score_from_transactions(count_flagged: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return min(1.0, count_flagged / total)
