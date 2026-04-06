import logging
import os
from typing import Any, Dict

import httpx

logger = logging.getLogger(__name__)


class PaystackClient:
    def __init__(self):
        self.secret = os.getenv("PAYSTACK_SECRET_KEY", "")
        self._client = httpx.Client(
            base_url="https://api.paystack.co",
            headers={
                "Authorization": f"Bearer {self.secret}",
            },
            timeout=30.0,
        )

    def verify_transaction(self, reference: str) -> Dict[str, Any]:
        if not self.secret:
            return {"status": False, "message": "not configured"}
        try:
            r = self._client.get(f"/transaction/verify/{reference}")
            return r.json()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Paystack verify failed: %s", exc)
            return {"status": False, "message": str(exc)}
