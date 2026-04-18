"""Single entry point for LLM selection (Mistral default; OpenAI and Groq optional)."""

import os
from functools import lru_cache
from typing import Optional

from django.conf import settings
from langchain_core.language_models import BaseChatModel

try:
    from langchain_mistralai import ChatMistralAI
except ImportError:
    ChatMistralAI = None  # type: ignore[misc, assignment]

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None  # type: ignore[misc, assignment]

try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None  # type: ignore[misc, assignment]


def _env_or_setting(name: str, default: str = "") -> str:
    """Prefer Django settings (django-environ); fall back to OS env for scripts/tests."""
    val = getattr(settings, name, None)
    if val is not None and str(val).strip():
        return str(val)
    return os.getenv(name, default)


def _build_chat_model(
    *,
    provider: str,
    temperature: float,
    max_tokens: int,
    mistral_model: str,
    openai_model: str,
    groq_model: str,
) -> BaseChatModel:
    if provider == "openai":
        if ChatOpenAI is None:
            raise RuntimeError("langchain-openai is not installed")
        return ChatOpenAI(
            model=openai_model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=_env_or_setting("OPENAI_API_KEY"),
        )

    if provider == "groq":
        if ChatGroq is None:
            raise RuntimeError("langchain-groq is not installed")
        return ChatGroq(
            model=groq_model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=_env_or_setting("GROQ_API_KEY"),
        )

    if provider != "mistral":
        raise ValueError(
            f"Unsupported LLM_PROVIDER={provider!r}; use mistral, openai, or groq"
        )

    if ChatMistralAI is None:
        raise RuntimeError("langchain-mistralai is not installed")
    return ChatMistralAI(
        model=mistral_model,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=_env_or_setting("MISTRAL_API_KEY"),
    )


@lru_cache(maxsize=16)
def _cached_llm(
    provider: str,
    temperature: float,
    max_tokens: int,
    mistral_model: str,
    openai_model: str,
    groq_model: str,
) -> BaseChatModel:
    return _build_chat_model(
        provider=provider,
        temperature=temperature,
        max_tokens=max_tokens,
        mistral_model=mistral_model,
        openai_model=openai_model,
        groq_model=groq_model,
    )


def get_llm(
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> BaseChatModel:
    provider = _env_or_setting("LLM_PROVIDER", "mistral").lower()
    temp = (
        temperature
        if temperature is not None
        else float(_env_or_setting("LLM_TEMPERATURE", "0.2"))
    )
    tokens = max_tokens or int(_env_or_setting("LLM_MAX_TOKENS", "4096"))
    return _cached_llm(
        provider,
        temp,
        tokens,
        _env_or_setting("MISTRAL_MODEL", "mistral-large-latest"),
        _env_or_setting("OPENAI_MODEL", "gpt-4o"),
        _env_or_setting("GROQ_MODEL", "llama-3.3-70b-versatile"),
    )


def get_routing_llm() -> BaseChatModel:
    """
    Fast coordinator routing: short JSON only.
    Set MISTRAL_ROUTING_MODEL / OPENAI_ROUTING_MODEL to a smaller/faster model.
    Optional LLM_PROVIDER_ROUTING overrides provider for this call only.
    """
    provider = (
        _env_or_setting("LLM_PROVIDER_ROUTING", "").strip().lower()
        or _env_or_setting("LLM_PROVIDER", "mistral").lower()
    )
    max_tok = int(_env_or_setting("LLM_ROUTING_MAX_TOKENS", "256"))
    mistral = _env_or_setting("MISTRAL_ROUTING_MODEL", "") or _env_or_setting(
        "MISTRAL_MODEL", "mistral-large-latest"
    )
    openai = _env_or_setting("OPENAI_ROUTING_MODEL", "") or _env_or_setting(
        "OPENAI_MODEL", "gpt-4o-mini"
    )
    groq = _env_or_setting("GROQ_ROUTING_MODEL", "") or _env_or_setting(
        "GROQ_MODEL", "llama-3.1-8b-instant"
    )
    return _cached_llm(
        provider,
        0.0,
        max_tok,
        mistral,
        openai,
        groq,
    )


def get_synthesis_llm() -> BaseChatModel:
    """Coordinator final answer; separate cap from specialist agents."""
    provider = (
        _env_or_setting("LLM_PROVIDER_SYNTHESIS", "").strip().lower()
        or _env_or_setting("LLM_PROVIDER", "mistral").lower()
    )
    max_tok = int(_env_or_setting("LLM_SYNTHESIS_MAX_TOKENS", "2048"))
    temp = float(
        _env_or_setting(
            "LLM_SYNTHESIS_TEMPERATURE",
            _env_or_setting("LLM_TEMPERATURE", "0.2"),
        )
    )
    return _cached_llm(
        provider,
        temp,
        max_tok,
        _env_or_setting("MISTRAL_MODEL", "mistral-large-latest"),
        _env_or_setting("OPENAI_MODEL", "gpt-4o"),
        _env_or_setting("GROQ_MODEL", "llama-3.3-70b-versatile"),
    )
