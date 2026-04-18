"""Mistral embedding model for Tier-1 RAG (same model for ingest and query)."""

from __future__ import annotations

from functools import lru_cache

from django.conf import settings
from langchain_core.embeddings import Embeddings

try:
    from langchain_mistralai import MistralAIEmbeddings
except ImportError:
    MistralAIEmbeddings = None  # type: ignore[misc, assignment]

from core.llm_factory import _env_or_setting


@lru_cache(maxsize=2)
def get_embedding_model() -> Embeddings:
    if MistralAIEmbeddings is None:
        raise RuntimeError("langchain-mistralai is not installed")
    model = getattr(settings, "MISTRAL_EMBED_MODEL", "mistral-embed")
    api_key = _env_or_setting("MISTRAL_API_KEY")
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY is required for embeddings")
    return MistralAIEmbeddings(model=model, api_key=api_key)
