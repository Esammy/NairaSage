import hashlib
import hmac
import json

from django.conf import settings


def _secret() -> str:
    return getattr(settings, "PAYSTACK_SECRET_KEY", "") or ""


def verify_paystack_signature(payload: bytes, signature: str) -> bool:
    secret = _secret()
    if not secret or not signature:
        return False
    digest = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(digest, signature)


def parse_event(body: bytes) -> dict:
    return json.loads(body.decode("utf-8"))
