"""Re-embed existing KnowledgeChunk rows with the current embedding model.

Use this after switching embedding providers (e.g. mistral-embed ->
text-embedding-v4). It re-embeds each chunk's stored `content` in place,
preserving the existing chunking — no PDF re-parsing, unlike ingest_books.

    python manage.py reembed_chunks            # re-embed only stale rows
    python manage.py reembed_chunks --all      # re-embed everything
"""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Re-embed KnowledgeChunk rows with the current embedding model."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--all", action="store_true", help="Re-embed every chunk, not just stale ones")
        parser.add_argument("--batch", type=int, default=10, help="Embedding batch size (DashScope cap ~10)")

    def handle(self, *args, **options) -> None:
        if connection.vendor != "postgresql":
            raise CommandError("reembed_chunks requires PostgreSQL (pgvector).")

        from apps.knowledge.models import KnowledgeChunk
        from core.embeddings_factory import get_embedding_model, get_embeddings_provider
        from core.llm_factory import _env_or_setting

        provider = get_embeddings_provider()
        if provider == "qwen":
            target_model = _env_or_setting("QWEN_EMBED_MODEL", "text-embedding-v4")
        else:
            target_model = getattr(settings, "MISTRAL_EMBED_MODEL", "mistral-embed")

        qs = KnowledgeChunk.objects.all()
        if not options["all"]:
            qs = qs.exclude(embedding_model=target_model)
        ids = list(qs.values_list("id", flat=True))
        if not ids:
            self.stdout.write(self.style.SUCCESS(f"Nothing to do; all chunks already on {target_model}."))
            return

        embed_model = get_embedding_model()
        batch = max(1, options["batch"])
        self.stdout.write(f"Re-embedding {len(ids)} chunks with {target_model} (batch={batch})...")

        done = 0
        for start in range(0, len(ids), batch):
            rows = list(KnowledgeChunk.objects.filter(id__in=ids[start : start + batch]))
            vectors = embed_model.embed_documents([r.content for r in rows])
            for row, vec in zip(rows, vectors):
                row.embedding = vec
                row.embedding_model = target_model
            KnowledgeChunk.objects.bulk_update(rows, ["embedding", "embedding_model"])
            done += len(rows)
            self.stdout.write(f"  {done}/{len(ids)}")

        self.stdout.write(self.style.SUCCESS(f"Re-embedded {done} chunks to {target_model}."))
