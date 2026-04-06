import hashlib
import hmac
import json
import os


def verify_paystack_signature(payload: bytes, signature: str) -> bool:
    secret = os.getenv("PAYSTACK_SECRET_KEY", "")
    if not secret or not signature:
        return False
    digest = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(digest, signature)


def parse_event(body: bytes) -> dict:
    return json.loads(body.decode("utf-8"))
