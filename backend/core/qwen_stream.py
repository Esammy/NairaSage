"""Raw DashScope streaming for Qwen thinking models.

langchain-openai (1.1.x) does not surface DashScope's `reasoning_content`
field on streamed chunks, so the "visible reasoning" deal-analysis feature
streams the thinking model directly over the OpenAI-compatible HTTP API and
yields the reasoning and answer channels separately.
"""

from __future__ import annotations

import json
import logging
from typing import Dict, Iterator, List, Tuple

import requests

from core.llm_factory import DASHSCOPE_DEFAULT_BASE_URL, _env_or_setting

logger = logging.getLogger(__name__)


def stream_thinking(
    messages: List[Dict[str, str]],
    *,
    model: str = "",
    max_tokens: int = 8192,
    timeout: int = 120,
) -> Iterator[Tuple[str, str]]:
    """Stream a Qwen thinking model. Yields ("reasoning", delta) for chain-of-
    thought and ("answer", delta) for the final answer, in arrival order.

    `messages` is a list of OpenAI-style {"role", "content"} dicts.
    """
    api_key = _env_or_setting("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is required for thinking-model streaming")
    base = _env_or_setting("DASHSCOPE_BASE_URL", DASHSCOPE_DEFAULT_BASE_URL).rstrip("/")
    model = model or _env_or_setting("QWEN_THINKING_MODEL", "qwen3-235b-a22b-thinking-2507")

    resp = requests.post(
        f"{base}/chat/completions",
        json={
            "model": model,
            "messages": messages,
            "stream": True,
            "max_tokens": max_tokens,
        },
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        stream=True,
        timeout=timeout,
    )
    resp.raise_for_status()
    for raw in resp.iter_lines(decode_unicode=True):
        if not raw or not raw.startswith("data:"):
            continue
        payload = raw[5:].strip()
        if payload == "[DONE]":
            break
        try:
            delta = json.loads(payload)["choices"][0]["delta"]
        except (json.JSONDecodeError, KeyError, IndexError):
            continue
        reasoning = delta.get("reasoning_content")
        if reasoning:
            yield "reasoning", reasoning
        content = delta.get("content")
        if content:
            yield "answer", content
