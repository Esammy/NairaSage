"""Single entry point for LLM selection (Mistral default, OpenAI optional)."""

import os
from typing import Optional

from langchain_core.language_models import BaseChatModel

try:
    from langchain_mistralai import ChatMistralAI
except ImportError:
    ChatMistralAI = None  # type: ignore[misc, assignment]

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None  # type: ignore[misc, assignment]


def _build_chat_model(
    *,
    provider: str,
    temperature: float,
    max_tokens: int,
    mistral_model: str,
    openai_model: str,
) -> BaseChatModel:
    if provider == "openai":
        if ChatOpenAI is None:
            raise RuntimeError("langchain-openai is not installed")
        return ChatOpenAI(
            model=openai_model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=os.getenv("OPENAI_API_KEY"),
        )

    if ChatMistralAI is None:
        raise RuntimeError("langchain-mistralai is not installed")
    return ChatMistralAI(
        model=mistral_model,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=os.getenv("MISTRAL_API_KEY"),
    )


def get_llm(
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> BaseChatModel:
    provider = os.getenv("LLM_PROVIDER", "mistral").lower()
    temp = (
        temperature
        if temperature is not None
        else float(os.getenv("LLM_TEMPERATURE", "0.2"))
    )
    tokens = max_tokens or int(os.getenv("LLM_MAX_TOKENS", "4096"))
    return _build_chat_model(
        provider=provider,
        temperature=temp,
        max_tokens=tokens,
        mistral_model=os.getenv("MISTRAL_MODEL", "mistral-large-latest"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o"),
    )


def get_routing_llm() -> BaseChatModel:
    """
    Fast coordinator routing: short JSON only.
    Set MISTRAL_ROUTING_MODEL / OPENAI_ROUTING_MODEL to a smaller/faster model.
    """
    provider = os.getenv("LLM_PROVIDER", "mistral").lower()
    max_tok = int(os.getenv("LLM_ROUTING_MAX_TOKENS", "256"))
    mistral = os.getenv(
        "MISTRAL_ROUTING_MODEL",
        os.getenv("MISTRAL_MODEL", "mistral-large-latest"),
    )
    openai = os.getenv(
        "OPENAI_ROUTING_MODEL",
        os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    )
    return _build_chat_model(
        provider=provider,
        temperature=0.0,
        max_tokens=max_tok,
        mistral_model=mistral,
        openai_model=openai,
    )


def get_synthesis_llm() -> BaseChatModel:
    """Coordinator final answer; separate cap from specialist agents."""
    provider = os.getenv("LLM_PROVIDER", "mistral").lower()
    max_tok = int(os.getenv("LLM_SYNTHESIS_MAX_TOKENS", "2048"))
    temp = float(os.getenv("LLM_SYNTHESIS_TEMPERATURE", os.getenv("LLM_TEMPERATURE", "0.2")))
    return _build_chat_model(
        provider=provider,
        temperature=temp,
        max_tokens=max_tok,
        mistral_model=os.getenv("MISTRAL_MODEL", "mistral-large-latest"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o"),
    )
