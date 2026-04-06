import logging
import os
from typing import Any, Dict, List

import httpx

logger = logging.getLogger(__name__)

MONO_BASE = "https://api.withmono.com"


class MonoClient:
    def __init__(self, secret_key: str | None = None):
        self.secret_key = secret_key or os.getenv("MONO_SECRET_KEY", "")
        self._client = httpx.Client(
            base_url=MONO_BASE,
            headers={"mono-sec-key": self.secret_key},
            timeout=30.0,
        )

    def get_transactions(self, account_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        if not self.secret_key:
            logger.warning("MONO_SECRET_KEY not set; returning no transactions")
            return []
        try:
            r = self._client.get(
                f"/v2/accounts/{account_id}/transactions",
                params={"limit": limit},
            )
            r.raise_for_status()
            data = r.json()
            return data.get("data", data if isinstance(data, list) else [])
        except Exception as exc:  # noqa: BLE001
            logger.exception("Mono get_transactions failed: %s", exc)
            return []
