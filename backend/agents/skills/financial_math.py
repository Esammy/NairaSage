import numpy as np


def compound_growth(principal: float, rate: float, years: int, contributions: float = 0):
    monthly_rate = rate / 12 / 100
    months = years * 12
    balance = principal
    history = []
    for m in range(months):
        balance = balance * (1 + monthly_rate) + contributions
        if m % 12 == 11:
            history.append(round(balance, 2))
    return {"final": round(balance, 2), "history": history}


def real_return(nominal_return_pct: float, inflation_pct: float) -> float:
    return ((1 + nominal_return_pct / 100) / (1 + inflation_pct / 100) - 1) * 100


def debt_payoff_schedule(principal: float, annual_rate: float, monthly_payment: float):
    monthly_rate = annual_rate / 12 / 100
    balance = principal
    months = 0
    total_interest = 0.0
    while balance > 0 and months < 600:
        interest = balance * monthly_rate
        principal_paid = monthly_payment - interest
        balance -= principal_paid
        total_interest += interest
        months += 1
    return {
        "months": months,
        "total_interest": round(total_interest, 2),
        "total_paid": round(principal + total_interest, 2),
    }


def sharpe_ratio(returns: list[float], risk_free: float = 0.18) -> float:
    if not returns or len(returns) < 2:
        return 0.0
    arr = np.array(returns)
    excess = arr - (risk_free / 12)
    return float(np.mean(excess) / (np.std(excess) + 1e-9))


def portfolio_var(returns: list[float], confidence: float = 0.95) -> float:
    if not returns:
        return 0.0
    return float(np.percentile(np.array(returns), (1 - confidence) * 100))


def paye_nigeria(annual_gross: float):
    bands = [
        (300_000, 7),
        (300_000, 11),
        (500_000, 15),
        (500_000, 19),
        (1_600_000, 21),
        (float("inf"), 24),
    ]
    cra = max(200_000, 0.01 * annual_gross) + 0.20 * annual_gross
    taxable = max(0, annual_gross - cra)
    tax = 0.0
    remaining = taxable
    for band_size, rate in bands:
        if remaining <= 0:
            break
        chunk = min(remaining, band_size)
        tax += chunk * rate / 100
        remaining -= chunk
    return {
        "gross": annual_gross,
        "cra": round(cra, 2),
        "taxable": round(taxable, 2),
        "tax": round(tax, 2),
        "effective_rate": round(tax / annual_gross * 100, 2) if annual_gross else 0,
        "monthly_paye": round(tax / 12, 2),
    }
