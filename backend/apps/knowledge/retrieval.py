"""Tier-1 book retrieval (Postgres + pgvector only)."""

from __future__ import annotations

import hashlib
import logging
from typing import Any

from django.core.cache import cache
from django.db import connection

logger = logging.getLogger(__name__)

_EMBED_CACHE_TTL = 86400
_RAG_IDS_CACHE_TTL = 3600
_CACHE_EMB_PREFIX = "rag_embed:v1"
_CACHE_IDS_PREFIX = "rag_chunk_ids:v1"


def _postgres_available() -> bool:
    return connection.vendor == "postgresql"


def _query_fingerprint(query: str) -> str:
    return hashlib.sha256(query.strip().lower().encode("utf-8")).hexdigest()[:32]


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

    qfp = _query_fingerprint(q)
    embed_key = f"{_CACHE_EMB_PREFIX}:{qfp}"
    qvec = cache.get(embed_key)
    try:
        emb = get_embedding_model()
        if qvec is None:
            qvec = emb.embed_query(q)
            cache.set(embed_key, qvec, _EMBED_CACHE_TTL)
    except Exception as e:  # noqa: BLE001
        logger.exception("embed_query failed: %s", e)
        return []

    ids_key = f"{_CACHE_IDS_PREFIX}:{agent_name}:{qfp}:{k}"
    cached_ids = cache.get(ids_key)
    try:
        if cached_ids:
            chunk_map = {
                row.pk: row
                for row in KnowledgeChunk.objects.filter(
                    pk__in=cached_ids,
                    is_time_sensitive=False,
                ).filter(agent_tags__overlap=[agent_name])
            }
            ordered = [chunk_map[i] for i in cached_ids if i in chunk_map]
            if len(ordered) != len(cached_ids):
                cached_ids = None
            else:
                qs_rows = ordered
        if not cached_ids:
            qs = (
                KnowledgeChunk.objects.filter(is_time_sensitive=False)
                .filter(agent_tags__overlap=[agent_name])
                .annotate(distance=CosineDistance("embedding", qvec))
                .order_by("distance")[:k]
            )
            qs_rows = list(qs)
            cache.set(ids_key, [row.pk for row in qs_rows], _RAG_IDS_CACHE_TTL)
        out: list[dict[str, Any]] = []
        for row in qs_rows:
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
