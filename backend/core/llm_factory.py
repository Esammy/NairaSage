"""Single entry point for LLM selection (Mistral default; Qwen, OpenAI, Groq, Gemini optional).

Qwen runs on Qwen Cloud (Alibaba Cloud Model Studio) through the OpenAI-compatible
DashScope endpoint, so it reuses langchain-openai's ChatOpenAI with a base_url override.
See scripts/qwen_smoke.py for the capability validation against this endpoint.
"""

import os
from functools import lru_cache
from typing import Optional

from django.conf import settings
from langchain_core.language_models import BaseChatModel
from langchain_core.runnables import Runnable

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

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None  # type: ignore[misc, assignment]


def _env_or_setting(name: str, default: str = "") -> str:
    """Prefer Django settings (django-environ); fall back to OS env for scripts/tests."""
    val = getattr(settings, name, None)
    if val is not None and str(val).strip():
        return str(val)
    return os.getenv(name, default)


def _gemini_api_key() -> str:
    """GEMINI_API_KEY in settings; GOOGLE_API_KEY as fallback (LangChain convention)."""
    return _env_or_setting("GEMINI_API_KEY") or _env_or_setting("GOOGLE_API_KEY")


DASHSCOPE_DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"


def _qwen_chat_model(model: str, temperature: float, max_tokens: int) -> BaseChatModel:
    """Qwen via DashScope compatible-mode (international endpoint by default).

    IMPORTANT: pass the output cap through extra_body["max_tokens"], NOT the
    ChatOpenAI max_tokens param. langchain-openai 1.1.x serializes max_tokens as
    `max_completion_tokens`, which DashScope's compatible mode ignores — so the
    cap is silently dropped and every call generates 3000+ tokens (~20s). Via
    extra_body the limit is honored (verified: 450 tokens, 2.8s vs 20.7s).
    """
    if ChatOpenAI is None:
        raise RuntimeError("langchain-openai is not installed")
    api_key = _env_or_setting("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is required when LLM_PROVIDER=qwen")
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=api_key,
        base_url=_env_or_setting("DASHSCOPE_BASE_URL", DASHSCOPE_DEFAULT_BASE_URL),
        extra_body={"max_tokens": max_tokens},
    )


def _qwen_fallback_models(
    env_var: str, default: str, temperature: float, max_tokens: int
) -> list:
    """Build backup Qwen chat models from a comma-separated list of model IDs.

    Returns [] when nothing is configured. Used to make a primary model resilient
    to per-model quota / rate-limit / 5xx errors: if the flagship (e.g. qwen3-max)
    is rejected, calls transparently retry on a backup (default qwen-flash, which
    shares the same DASHSCOPE_API_KEY). Unknown/duplicate IDs are skipped.
    """
    models: list = []
    for name in [m.strip() for m in _env_or_setting(env_var, default).split(",") if m.strip()]:
        try:
            models.append(_qwen_chat_model(name, temperature, max_tokens))
        except Exception:  # noqa: BLE001 - a bad backup ID must not break the primary
            continue
    return models


def _with_qwen_fallbacks(
    primary: BaseChatModel,
    provider: str,
    env_var: str,
    default: str,
    temperature: float,
    max_tokens: int,
) -> Runnable:
    """Wrap `primary` with LangChain automatic fallbacks when running on Qwen.

    No-op for other providers or when no valid backups are configured, so default
    behaviour is unchanged unless a fallback env var is set.
    """
    if provider != "qwen":
        return primary
    fallbacks = _qwen_fallback_models(env_var, default, temperature, max_tokens)
    return primary.with_fallbacks(fallbacks) if fallbacks else primary


def get_coach_fallback_models() -> list:
    """Backup models for the coach's tool-calling loop.

    Wrap these via `.with_fallbacks()` AFTER `bind_tools()` (a RunnableWithFallbacks
    has no bind_tools). Empty for non-Qwen providers.
    """
    provider = _env_or_setting("LLM_PROVIDER", "mistral").lower()
    if provider != "qwen":
        return []
    temp = float(_env_or_setting("LLM_TEMPERATURE", "0.2"))
    tokens = int(_env_or_setting("LLM_MAX_TOKENS", "4096"))
    return _qwen_fallback_models("QWEN_COACH_FALLBACKS", "qwen-flash", temp, tokens)


def _build_chat_model(
    *,
    provider: str,
    temperature: float,
    max_tokens: int,
    mistral_model: str,
    openai_model: str,
    groq_model: str,
    gemini_model: str,
    qwen_model: str = "qwen-flash",
) -> BaseChatModel:
    if provider == "qwen":
        return _qwen_chat_model(qwen_model, temperature, max_tokens)

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

    if provider == "gemini":
        if ChatGoogleGenerativeAI is None:
            raise RuntimeError("langchain-google-genai is not installed")
        api_key = _gemini_api_key()
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY (or GOOGLE_API_KEY) is required when LLM_PROVIDER=gemini"
            )
        return ChatGoogleGenerativeAI(
            model=gemini_model,
            temperature=temperature,
            max_output_tokens=max_tokens,
            api_key=api_key,
        )

    if provider != "mistral":
        raise ValueError(
            f"Unsupported LLM_PROVIDER={provider!r}; "
            "use mistral, qwen, openai, groq, or gemini"
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
) -> Runnable:
    provider = _env_or_setting("LLM_PROVIDER", "mistral").lower()
    temp = (
        temperature
        if temperature is not None
        else float(_env_or_setting("LLM_TEMPERATURE", "0.2"))
    )
    tokens = max_tokens or int(_env_or_setting("LLM_MAX_TOKENS", "4096"))
    primary = _build_chat_model(
        provider=provider,
        temperature=temp,
        max_tokens=tokens,
        mistral_model=_env_or_setting("MISTRAL_MODEL", "mistral-large-latest"),
        openai_model=_env_or_setting("OPENAI_MODEL", "gpt-4o"),
        groq_model=_env_or_setting("GROQ_MODEL", "llama-3.3-70b-versatile"),
        gemini_model=_env_or_setting("GEMINI_MODEL", "gemini-2.5-flash"),
        qwen_model=_env_or_setting("QWEN_MODEL", "qwen-flash"),
    )
    # Opt-in backups (QWEN_FALLBACKS); default empty since specialists run on qwen-flash.
    return _with_qwen_fallbacks(primary, provider, "QWEN_FALLBACKS", "", temp, tokens)


def get_routing_llm() -> BaseChatModel:
    """
    Fast coordinator routing: short JSON only.
    Set *_ROUTING_MODEL to a smaller/faster model for your provider.
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
    gemini = _env_or_setting("GEMINI_ROUTING_MODEL", "") or _env_or_setting(
        "GEMINI_MODEL", "gemini-2.0-flash"
    )
    qwen = _env_or_setting("QWEN_ROUTING_MODEL", "") or _env_or_setting(
        "QWEN_MODEL", "qwen-flash"
    )
    primary = _build_chat_model(
        provider=provider,
        temperature=0.0,
        max_tokens=max_tok,
        mistral_model=mistral,
        openai_model=openai,
        groq_model=groq,
        gemini_model=gemini,
        qwen_model=qwen,
    )
    # Opt-in backups (QWEN_ROUTING_FALLBACKS); default empty since routing runs on qwen-flash.
    return _with_qwen_fallbacks(primary, provider, "QWEN_ROUTING_FALLBACKS", "", 0.0, max_tok)


def get_synthesis_llm() -> Runnable:
    """Coordinator final answer; separate cap from specialist agents.

    On Qwen the flagship qwen3-max is wrapped with automatic fallbacks
    (QWEN_SYNTHESIS_FALLBACKS, default qwen-flash) so a per-model quota/rate-limit
    rejection transparently retries on a backup instead of surfacing
    "I could not complete the response."
    """
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
    primary = _build_chat_model(
        provider=provider,
        temperature=temp,
        max_tokens=max_tok,
        mistral_model=_env_or_setting("MISTRAL_MODEL", "mistral-large-latest"),
        openai_model=_env_or_setting("OPENAI_MODEL", "gpt-4o"),
        groq_model=_env_or_setting("GROQ_MODEL", "llama-3.3-70b-versatile"),
        gemini_model=_env_or_setting("GEMINI_MODEL", "gemini-2.5-flash"),
        qwen_model=_env_or_setting("QWEN_SYNTHESIS_MODEL", "")
        or _env_or_setting("QWEN_MODEL", "qwen3-max"),
    )
    return _with_qwen_fallbacks(
        primary, provider, "QWEN_SYNTHESIS_FALLBACKS", "qwen-flash", temp, max_tok
    )


def get_coach_llm() -> BaseChatModel:
    """Rich Dad Coach: the tool-calling agentic loop deserves the flagship model.

    On Qwen this defaults to qwen3-max; other providers fall back to get_llm().
    """
    provider = _env_or_setting("LLM_PROVIDER", "mistral").lower()
    if provider != "qwen":
        return get_llm()
    temp = float(_env_or_setting("LLM_TEMPERATURE", "0.2"))
    tokens = int(_env_or_setting("LLM_MAX_TOKENS", "4096"))
    model = _env_or_setting("QWEN_COACH_MODEL", "qwen3-max")
    return _qwen_chat_model(model, temp, tokens)


def get_vision_llm() -> BaseChatModel:
    """Multimodal Qwen (qwen3-vl) for document/statement scanning. Qwen-only feature."""
    model = _env_or_setting("QWEN_VL_MODEL", "qwen3-vl-plus")
    tokens = int(_env_or_setting("LLM_VISION_MAX_TOKENS", "4096"))
    return _qwen_chat_model(model, temperature=0.0, max_tokens=tokens)


def get_thinking_llm() -> BaseChatModel:
    """Qwen thinking model for deal deep-analysis; reasoning arrives as
    additional_kwargs["reasoning_content"] on streamed chunks. Qwen-only feature."""
    model = _env_or_setting("QWEN_THINKING_MODEL", "qwen3-235b-a22b-thinking-2507")
    tokens = int(_env_or_setting("LLM_THINKING_MAX_TOKENS", "8192"))
    return _qwen_chat_model(model, temperature=1.0, max_tokens=tokens)
