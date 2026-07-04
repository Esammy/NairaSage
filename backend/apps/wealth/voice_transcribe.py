"""Voice transcription with Qwen ASR on Qwen Cloud (DashScope).

The browser records 16 kHz mono PCM, packages it as WAV, and POSTs it here;
we call qwen3-asr via DashScope's native multimodal-generation endpoint and
return the transcript. Push-to-talk (record -> upload -> transcribe) keeps the
DASHSCOPE_API_KEY server-side — DashScope has no short-lived browser-token
scheme like AssemblyAI's, so streaming from the browser would require a
websocket proxy for no demo benefit.
"""

from __future__ import annotations

import base64
import binascii
import logging

import requests
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.llm_factory import DASHSCOPE_DEFAULT_BASE_URL, _env_or_setting

logger = logging.getLogger(__name__)

ALLOWED_FORMATS = {"wav", "mp3", "m4a", "webm", "ogg", "opus"}
MAX_BYTES = 10 * 1024 * 1024  # ~5 min of 16 kHz mono WAV


def _native_asr_url() -> str:
    base = _env_or_setting("DASHSCOPE_BASE_URL", DASHSCOPE_DEFAULT_BASE_URL)
    root = base.split("/compatible-mode")[0].rstrip("/")
    return f"{root}/api/v1/services/aigc/multimodal-generation/generation"


class QwenTranscribeView(APIView):
    """POST /api/wealth/voice/transcribe/ {audio_b64, format} -> {text}."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def post(self, request):
        api_key = _env_or_setting("DASHSCOPE_API_KEY")
        if not api_key:
            return Response(
                {"error": "Voice transcription is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        fmt = str(request.data.get("format") or "wav").lower()
        audio_b64 = request.data.get("audio_b64") or ""
        if fmt not in ALLOWED_FORMATS:
            return Response(
                {"error": f"Unsupported audio format {fmt!r}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            raw_len = len(base64.b64decode(audio_b64, validate=True))
        except (binascii.Error, ValueError):
            return Response(
                {"error": "audio_b64 is not valid base64"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not raw_len or raw_len > MAX_BYTES:
            return Response(
                {"error": "Audio must be under 10MB"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        model = _env_or_setting("QWEN_ASR_MODEL", "qwen3-asr-flash-2026-02-10")
        payload = {
            "model": model,
            "input": {
                "messages": [
                    {"role": "system", "content": [{"text": ""}]},
                    {
                        "role": "user",
                        "content": [{"audio": f"data:audio/{fmt};base64,{audio_b64}"}],
                    },
                ]
            },
            "parameters": {"asr_options": {"enable_itn": True}},
        }
        try:
            resp = requests.post(
                _native_asr_url(),
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=60,
            )
        except requests.RequestException as e:
            logger.exception("Qwen ASR request failed: %s", e)
            return Response(
                {"error": "Transcription service unreachable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if resp.status_code != 200:
            logger.warning("Qwen ASR error %s: %s", resp.status_code, resp.text[:300])
            return Response(
                {"error": "Transcription failed"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            content = resp.json()["output"]["choices"][0]["message"]["content"]
            text = "".join(
                part.get("text", "") for part in content if isinstance(part, dict)
            ).strip()
        except (KeyError, IndexError, TypeError, ValueError):
            logger.warning("Qwen ASR unexpected response shape: %s", resp.text[:300])
            return Response(
                {"error": "Transcription returned no text"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"text": text, "model": model})
