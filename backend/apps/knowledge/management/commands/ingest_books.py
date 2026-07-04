"""
Ingest PDFs from backend/books into KnowledgeChunk (Postgres + pgvector).

Requires DATABASE_URL pointing at PostgreSQL with the vector extension.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

logger = logging.getLogger(__name__)

MANIFEST_NAME = "books_manifest.json"


def _sanitize_text(s: str) -> str:
    """
    Postgres text fields reject NUL (0x00). PDF extractors often emit NULs and
    other C0 controls from broken font/binary streams.
    """
    if not s:
        return ""
    s = s.replace("\x00", "")
    out: list[str] = []
    for ch in s:
        o = ord(ch)
        if o < 32 and ch not in ("\n", "\t", "\r"):
            out.append(" ")
        else:
            out.append(ch)
    return "".join(out)


def _chunk_text(text: str, max_chars: int = 2400) -> list[str]:
    """Paragraph-oriented chunks with a hard cap to keep embeddings coherent."""
    parts = [p.strip() for p in text.replace("\r\n", "\n").split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in parts:
        if len(buf) + len(p) + 2 <= max_chars:
            buf = (buf + "\n\n" + p).strip() if buf else p
        else:
            if buf:
                chunks.append(buf)
            if len(p) <= max_chars:
                buf = p
            else:
                for i in range(0, len(p), max_chars):
                    chunks.append(p[i : i + max_chars])
                buf = ""
        while len(buf) > max_chars:
            chunks.append(buf[:max_chars])
            buf = buf[max_chars:].lstrip()
    if buf:
        chunks.append(buf)
    return chunks


def _extract_pdf_text(path: Path) -> str:
    from pypdf import PdfReader

    # Malformed font streams log "Odd-length string" etc. at INFO; keep console quiet.
    noisy = (
        "pypdf",
        "pypdf._reader",
        "pypdf.generic",
        "pypdf.pdfparser",
    )
    old_levels: dict[str, int] = {}
    for name in noisy:
        lg = logging.getLogger(name)
        old_levels[name] = lg.level
        lg.setLevel(logging.ERROR)

    try:
        reader = PdfReader(str(path), strict=False)
        texts: list[str] = []
        for page in reader.pages:
            try:
                t = page.extract_text() or ""
            except Exception as e:  # noqa: BLE001
                logger.warning("Page extract failed %s: %s", path, e)
                t = ""
            t = _sanitize_text(t)
            if t.strip():
                texts.append(t)
        return _sanitize_text("\n\n".join(texts))
    finally:
        for name, lvl in old_levels.items():
            logging.getLogger(name).setLevel(lvl)


class Command(BaseCommand):
    help = "Chunk and embed PDFs from the books directory into KnowledgeChunk."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--books-dir",
            type=str,
            default="",
            help="Override books directory (default: BASE_DIR/books)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and chunk only; do not write to the database",
        )
        parser.add_argument(
            "--flush",
            action="store_true",
            help=(
                "Delete ALL existing chunks before ingesting. Required when the "
                "embedding provider/model changes (vectors from different models "
                "live in different cosine spaces and must not be mixed)."
            ),
        )

    def handle(self, *args, **options) -> None:
        if connection.vendor != "postgresql":
            raise CommandError(
                "ingest_books requires PostgreSQL (DATABASE_URL). "
                "SQLite cannot store pgvector embeddings."
            )

        base = Path(settings.BASE_DIR)
        books_dir = Path(options["books_dir"]) if options["books_dir"] else base / "books"
        if not books_dir.is_dir():
            raise CommandError(f"Books directory not found: {books_dir}")

        manifest_path = Path(__file__).resolve().parent.parent.parent / "data" / MANIFEST_NAME
        manifest: dict = {}
        if manifest_path.is_file():
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        else:
            self.stderr.write(f"Warning: no manifest at {manifest_path}, using filenames only\n")

        pdfs = sorted(books_dir.glob("*.pdf"))
        if not pdfs:
            raise CommandError(f"No PDF files in {books_dir}")

        from apps.knowledge.models import KnowledgeChunk
        from core.embeddings_factory import get_embedding_model, get_embeddings_provider
        from core.llm_factory import _env_or_setting

        embed_model = get_embedding_model()
        provider = get_embeddings_provider()
        if provider == "qwen":
            embed_name = _env_or_setting("QWEN_EMBED_MODEL", "text-embedding-v4")
        else:
            embed_name = getattr(settings, "MISTRAL_EMBED_MODEL", "mistral-embed")

        if options["flush"] and not options["dry_run"]:
            deleted, _ = KnowledgeChunk.objects.all().delete()
            self.stdout.write(f"Flushed {deleted} existing chunks\n")
        stale = KnowledgeChunk.objects.exclude(embedding_model=embed_name)
        if stale.exists() and not options["flush"]:
            raise CommandError(
                f"Found chunks embedded with a different model than {embed_name!r}. "
                "Mixed-model vectors silently degrade retrieval; re-run with --flush."
            )

        total_chunks = 0
        for pdf in pdfs:
            meta = manifest.get(pdf.name, {})
            book_title = meta.get("book_title") or pdf.stem.replace("_", " ")
            author = meta.get("author", "")
            year = meta.get("publication_year")
            content_type = meta.get("content_type", "principle")
            agent_tags = list(meta.get("agent_tags") or [])
            if not agent_tags:
                self.stderr.write(f"Skipping {pdf.name} (no agent_tags in manifest)\n")
                continue

            text = _extract_pdf_text(pdf)
            if not text.strip():
                self.stderr.write(f"Skipping {pdf.name} (no extractable text)\n")
                continue

            chunks = _chunk_text(text)
            rel_source = str(pdf.relative_to(base)).replace("\\", "/")

            if options["dry_run"]:
                self.stdout.write(f"[dry-run] {pdf.name}: {len(chunks)} chunks\n")
                total_chunks += len(chunks)
                continue

            KnowledgeChunk.objects.filter(source_path=rel_source).delete()

            batch_size = 16
            idx = 0
            for start in range(0, len(chunks), batch_size):
                batch = [_sanitize_text(c) for c in chunks[start : start + batch_size]]
                vectors = embed_model.embed_documents(batch)
                rows = []
                for j, (content, vec) in enumerate(zip(batch, vectors)):
                    rows.append(
                        KnowledgeChunk(
                            content=_sanitize_text(content),
                            embedding=vec,
                            book_title=_sanitize_text(book_title)[:512],
                            author=_sanitize_text(str(author))[:512],
                            publication_year=year,
                            chapter="",
                            content_type=str(content_type)[:64],
                            agent_tags=agent_tags,
                            is_time_sensitive=False,
                            source_path=rel_source,
                            chunk_index=idx,
                            embedding_model=embed_name,
                            extra={"filename": pdf.name},
                        )
                    )
                    idx += 1
                KnowledgeChunk.objects.bulk_create(rows)
            self.stdout.write(f"Ingested {pdf.name}: {len(chunks)} chunks -> {rel_source}\n")
            total_chunks += len(chunks)

        self.stdout.write(self.style.SUCCESS(f"Done. Total chunks: {total_chunks}"))
