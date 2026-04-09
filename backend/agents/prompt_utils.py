"""Replace {PLACEHOLDER} tokens in prompt templates."""

from __future__ import annotations

import re
from typing import Mapping

_PLACEHOLDER_RE = re.compile(r"\{([A-Z][A-Z0-9_]*)\}")


def render_prompt(template: str, context: Mapping[str, str]) -> str:
    """Substitute `{NAME}` keys; missing keys become a visible stub (should not happen if agents merge contexts)."""

    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        if key in context:
            return context[key]
        return f"[{key}: not provided]"

    return _PLACEHOLDER_RE.sub(repl, template)
