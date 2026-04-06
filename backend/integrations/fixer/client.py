import logging
import os
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class FixerClient:
    def __init__(self):
        self.api_key = os.getenv("FIXER_API_KEY", "")

    def latest_rates(self, base: str = "EUR") -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None
        try:
            with httpx.Client(timeout=20.0) as client:
                r = client.get(
                    "https://data.fixer.io/api/latest",
                    params={"access_key": self.api_key, "base": base},
                )
                if r.status_code == 200:
                    return r.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Fixer latest_rates failed: %s", exc)
        return None
