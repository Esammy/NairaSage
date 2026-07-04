"""Embedding model for Tier-1 RAG (same model must be used for ingest and query).

Provider selection: EMBEDDINGS_PROVIDER if set, otherwise follows LLM_PROVIDER.
Supported: qwen (text-embedding-v4 on Qwen Cloud / DashScope) and mistral.

IMPORTANT: vectors from different models live in different cosine spaces. After
switching providers, re-embed the corpus:  python manage.py ingest_books --flush
We pin Qwen's output to 1024 dims (text-embedding-v4 supports 64-2048) to match
the existing pgvector VectorField(dimensions=1024) — no schema migration needed.
"""

from __future__ import annotations

from functools import lru_cache

from django.conf import settings
from langchain_core.embeddings import Embeddings

try:
    from langchain_mistralai import MistralAIEmbeddings
except ImportError:
    MistralAIEmbeddings = None  # type: ignore[misc, assignment]

try:
    from langchain_openai import OpenAIEmbeddings
except ImportError:
    OpenAIEmbeddings = None  # type: ignore[misc, assignment]

from core.llm_factory import DASHSCOPE_DEFAULT_BASE_URL, _env_or_setting

EMBED_DIMENSIONS = 1024  # must match apps/knowledge VectorField(dimensions=1024)


def get_embeddings_provider() -> str:
    provider = _env_or_setting("EMBEDDINGS_PROVIDER", "").lower()
    return provider or _env_or_setting("LLM_PROVIDER", "mistral").lower()


@lru_cache(maxsize=2)
def get_embedding_model() -> Embeddings:
    provider = get_embeddings_provider()

    if provider == "qwen":
        if OpenAIEmbeddings is None:
            raise RuntimeError("langchain-openai is not installed")
        api_key = _env_or_setting("DASHSCOPE_API_KEY")
        if not api_key:
            raise RuntimeError("DASHSCOPE_API_KEY is required for Qwen embeddings")
        return OpenAIEmbeddings(
            model=_env_or_setting("QWEN_EMBED_MODEL", "text-embedding-v4"),
            api_key=api_key,
            base_url=_env_or_setting("DASHSCOPE_BASE_URL", DASHSCOPE_DEFAULT_BASE_URL),
            dimensions=EMBED_DIMENSIONS,
            # DashScope accepts raw strings only, not tiktoken token arrays.
            check_embedding_ctx_length=False,
            # DashScope caps text-embedding-v4 at ~10 inputs per request.
            chunk_size=10,
        )

    if MistralAIEmbeddings is None:
        raise RuntimeError("langchain-mistralai is not installed")
    model = getattr(settings, "MISTRAL_EMBED_MODEL", "mistral-embed")
    api_key = _env_or_setting("MISTRAL_API_KEY")
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY is required for embeddings")
    return MistralAIEmbeddings(model=model, api_key=api_key)
