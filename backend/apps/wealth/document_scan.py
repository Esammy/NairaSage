"""Financial document scan with Qwen vision (qwen3-vl).

A photo/screenshot of a bank statement or receipt is sent to the vision model,
which extracts structured financial facts. Every extracted change is piped
through the existing confirm-before-write ActionProposal flow — the model can
propose, only the user can commit. Uploads are stored via Django storage
(Alibaba OSS in production).

Most Nigerian bank data arrives as PDFs/screenshots rather than open-banking
feeds, so this is the realistic on-ramp for statement data.
"""

from __future__ import annotations

import base64
import binascii
import json
import logging
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from langchain_core.messages import HumanMessage, SystemMessage
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.wealth.actions import create_proposal
from core.llm_factory import get_vision_llm
from core.utils import extract_json_object

logger = logging.getLogger(__name__)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024
# Vision output may only ever propose these tools (validated again by
# create_proposal's pydantic schemas before a proposal row is created).
SCAN_TOOL_WHITELIST = {"update_statement_inputs", "upsert_asset", "upsert_liability"}
MAX_PROPOSALS_PER_SCAN = 8

SYSTEM_PROMPT = """You extract financial data from photos of Nigerian bank
statements, account screenshots, and receipts. Amounts are in Naira (NGN)
unless clearly stated otherwise.

Reply with EXACTLY one JSON object:
{
  "document_type": "bank_statement" | "receipt" | "account_screenshot" | "other",
  "summary": "<2-3 sentences: what the document shows, notable patterns>",
  "proposals": [
    {"tool": "update_statement_inputs",
     "args": {"income_active": <number|omit>, "income_passive": <number|omit>,
              "expenses_essential": <number|omit>, "expenses_doodad": <number|omit>}},
    {"tool": "upsert_asset",
     "args": {"name": "<str>", "kiyosaki_type": "cash_eq|stock|real_estate|business|commodity|crypto|other",
              "market_value": <number>, "monthly_cashflow": <number>, "notes": "<source>"}},
    {"tool": "upsert_liability",
     "args": {"name": "<str>", "is_good_debt": <bool>, "balance": <number>,
              "monthly_payment": <number>, "notes": "<source>"}}
  ]
}

Rules:
- Propose only what the document clearly supports; omit uncertain numbers.
- Monthly figures: if the statement covers one month, totals map directly;
  otherwise normalise to per-month and say so in the summary.
- An account balance is an upsert_asset with kiyosaki_type "cash_eq".
- Recurring loan deductions are an upsert_liability (monthly_payment).
- If the image is not a financial document, return an empty proposals list
  and explain in summary."""


class DocumentScanView(APIView):
    """POST /api/wealth/documents/scan/ {filename, mime, data_b64} -> proposals."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "agent"

    def post(self, request):
        mime = str(request.data.get("mime") or "")
        filename = str(request.data.get("filename") or "upload")
        data_b64 = request.data.get("data_b64") or ""
        if mime not in ALLOWED_MIME:
            return Response(
                {"error": f"Unsupported file type {mime!r}; use JPEG, PNG, or WebP"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            raw = base64.b64decode(data_b64, validate=True)
        except (binascii.Error, ValueError):
            return Response(
                {"error": "data_b64 is not valid base64"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not raw or len(raw) > MAX_BYTES:
            return Response(
                {"error": f"Image must be 1 byte - {MAX_BYTES // (1024 * 1024)}MB"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = mime.split("/")[-1].replace("jpeg", "jpg")
        stored_path = default_storage.save(
            f"scans/user_{request.user.id}/{uuid.uuid4().hex}.{ext}",
            ContentFile(raw),
        )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=[
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{data_b64}"},
                    },
                    {"type": "text", "text": f"Extract financial data from this document ({filename})."},
                ]
            ),
        ]
        try:
            ai = get_vision_llm().invoke(messages)
            raw_reply = ai.content if isinstance(ai.content, str) else json.dumps(ai.content)
            parsed = json.loads(extract_json_object(raw_reply))
        except Exception as e:  # noqa: BLE001
            logger.exception("Document scan vision call failed: %s", e)
            return Response(
                {"error": "Could not analyze the document. Please try a clearer photo."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        proposals_out = []
        for item in list(parsed.get("proposals") or [])[:MAX_PROPOSALS_PER_SCAN]:
            tool = str(item.get("tool") or "")
            args = item.get("args") or {}
            if tool not in SCAN_TOOL_WHITELIST or not isinstance(args, dict):
                continue
            try:
                prop = create_proposal(request.user, tool, args)
            except Exception as e:  # noqa: BLE001
                logger.warning("Scan proposal rejected for %s: %s", tool, e)
                continue
            proposals_out.append(
                {
                    "id": prop.id,
                    "tool": prop.tool,
                    "args": prop.args,
                    "human_summary": prop.human_summary,
                    "diff_preview": prop.diff_preview,
                }
            )

        return Response(
            {
                "document_type": str(parsed.get("document_type") or "other"),
                "summary": str(parsed.get("summary") or ""),
                "proposals": proposals_out,
                "stored_path": stored_path,
            }
        )
