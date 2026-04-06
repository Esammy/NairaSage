import hashlib
import hmac
import logging
import os

logger = logging.getLogger(__name__)


def verify_mono_signature(payload: bytes, signature: str) -> bool:
    secret = os.getenv("MONO_WEBHOOK_SECRET", "")
    if not secret or not signature:
        return False
    expected = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
