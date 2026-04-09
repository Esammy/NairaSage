import logging
import os
from typing import Any, Dict, Optional

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


def _secret() -> str:
    return getattr(settings, "PAYSTACK_SECRET_KEY", "") or os.getenv("PAYSTACK_SECRET_KEY", "")


class PaystackClient:
    def __init__(self):
        self.secret = _secret()
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

    def initialize_subscription(
        self,
        *,
        email: str,
        plan_code: str,
        callback_url: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.secret:
            return {"status": False, "message": "Paystack not configured"}
        payload: Dict[str, Any] = {
            "email": email,
            "plan": plan_code,
            "callback_url": callback_url,
        }
        if metadata:
            payload["metadata"] = metadata
        try:
            r = self._client.post("/transaction/initialize", json=payload)
            return r.json()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Paystack initialize failed: %s", exc)
            return {"status": False, "message": str(exc)}
