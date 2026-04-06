import logging
import os
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class NGXClient:
    def __init__(self):
        self.base_url = os.getenv(
            "NGX_API_URL", "https://marketdataapiv3.ngxgroup.com/api"
        )
        self.api_key = os.getenv("NGX_API_KEY", "")
        self.itick_key = os.getenv("ITICK_API_KEY", "")

    def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        if self.api_key:
            try:
                with httpx.Client(timeout=20.0) as client:
                    r = client.get(
                        f"{self.base_url}/quote/{symbol}",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                    )
                    if r.status_code == 200:
                        return r.json()
            except Exception as exc:  # noqa: BLE001
                logger.warning("NGX quote failed: %s", exc)
        if self.itick_key:
            logger.info("iTick fallback not implemented; return None for %s", symbol)
        return None
