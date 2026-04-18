"""Shared helpers for streaming LLM chunks (LangChain chat models)."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessageChunk


def stream_chunk_text(chunk: Any) -> str:
    if chunk is None:
        return ""
    if isinstance(chunk, AIMessageChunk):
        c = chunk.content
    elif hasattr(chunk, "content"):
        c = getattr(chunk, "content", "")
    else:
        return str(chunk) if chunk else ""
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        parts = []
        for item in c:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
            elif isinstance(item, str):
                parts.append(item)
        return "".join(parts)
    return str(c) if c else ""
