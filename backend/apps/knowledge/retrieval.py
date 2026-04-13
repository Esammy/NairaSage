"""Tier-1 book retrieval (Postgres + pgvector only)."""

from __future__ import annotations

import logging
from typing import Any

from django.db import connection

logger = logging.getLogger(__name__)


def _postgres_available() -> bool:
    return connection.vendor == "postgresql"


def retrieve_knowledge(query: str, agent_name: str, k: int = 4) -> list[dict[str, Any]]:
    """
    Return chunk dicts with text + metadata for the given specialist.
    Excludes is_time_sensitive rows; requires agent tag overlap.
    """
    if not _postgres_available():
        return []

    q = (query or "").strip()
    if not q:
        return []

    try:
        from pgvector.django import CosineDistance

        from apps.knowledge.models import KnowledgeChunk
        from core.embeddings_factory import get_embedding_model
    except Exception as e:  # noqa: BLE001
        logger.warning("RAG dependencies unavailable: %s", e)
        return []

    try:
        emb = get_embedding_model()
        qvec = emb.embed_query(q)
    except Exception as e:  # noqa: BLE001
        logger.exception("embed_query failed: %s", e)
        return []

    try:
        qs = (
            KnowledgeChunk.objects.filter(is_time_sensitive=False)
            .filter(agent_tags__overlap=[agent_name])
            .annotate(distance=CosineDistance("embedding", qvec))
            .order_by("distance")[:k]
        )
        out: list[dict[str, Any]] = []
        for row in qs:
            out.append(
                {
                    "content": row.content,
                    "book_title": row.book_title,
                    "author": row.author,
                    "publication_year": row.publication_year,
                    "chapter": row.chapter,
                    "content_type": row.content_type,
                    "distance": float(getattr(row, "distance", 0.0) or 0.0),
                }
            )
        return out
    except Exception as e:  # noqa: BLE001
        logger.exception("knowledge retrieval failed: %s", e)
        return []


def format_passages_for_prompt(chunks: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for i, c in enumerate(chunks, start=1):
        title = c.get("book_title") or "Unknown"
        author = c.get("author") or ""
        chapter = c.get("chapter") or ""
        year = c.get("publication_year")
        year_s = f", {year}" if year else ""
        head = f"[{i}] From: {title}"
        if author:
            head += f" by {author}{year_s}"
        if chapter:
            head += f" — {chapter}"
        lines.append(f"{head}\n{c.get('content', '').strip()}")
    return "\n\n---\n\n".join(lines)


def retrieve_knowledge_context(query: str, agent_name: str, k: int = 4) -> str:
    chunks = retrieve_knowledge(query, agent_name, k=k)
    if not chunks:
        return (
            "(No matching Tier-1 passages in the knowledge base for this query. "
            "Do not invent book quotes. Use Tier-2 data and general reasoning only.)"
        )
    return format_passages_for_prompt(chunks)
