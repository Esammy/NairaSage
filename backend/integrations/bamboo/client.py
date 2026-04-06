import os

import httpx


class BambooClient:
    def __init__(self):
        self.base_url = os.getenv("BAMBOO_API_URL", "")
        self.api_key = os.getenv("BAMBOO_API_KEY", "")

    def headers(self):
        return {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}

    def health(self):
        if not self.base_url:
            return {"ok": False, "reason": "not configured"}
        return {"ok": True}
