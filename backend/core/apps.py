import logging
import os

from django.apps import AppConfig

logger = logging.getLogger(__name__)
_core_warmup_done = False


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
    label = "core"

    def ready(self) -> None:
        global _core_warmup_done
        if _core_warmup_done:
            return
        if os.environ.get("NAIRASAGE_SKIP_WARMUP") == "1":
            return
        try:
            from core.embeddings_factory import get_embedding_model
            from core.llm_factory import get_routing_llm, get_synthesis_llm

            get_routing_llm()
            get_synthesis_llm()
            try:
                emb = get_embedding_model()
                emb.embed_query("warmup")
            except Exception as emb_exc:  # noqa: BLE001
                logger.warning("Embedding warmup skipped: %s", emb_exc)
        except Exception as e:  # noqa: BLE001
            logger.warning("LLM warmup skipped: %s", e)
        _core_warmup_done = True
