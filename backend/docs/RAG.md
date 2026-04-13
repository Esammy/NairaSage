# Tier-1 book RAG (Postgres + pgvector)

NairaSage stores curated book chunks with **Mistral `mistral-embed`** vectors for specialists that set `use_tier1_rag = True`. Live numbers, tax bands, and deadlines must still come from **Tier-2** (user data and integrated APIs) or the **researcher** agent (Tavily), never from book passages.

## Requirements

1. **PostgreSQL** with the [pgvector](https://github.com/pgvector/pgvector) extension enabled.
2. Set **`DATABASE_URL`** in `.env`. The `apps.knowledge` Django app is **only registered when `DATABASE_URL` is set** so local SQLite dev/tests can run without pgvector migrations.
3. **`MISTRAL_API_KEY`** for embeddings (same key as chat is fine).
4. Optional: **`TAVILY_API_KEY`** for the `researcher` agent (coordinator-routed).

## One-time setup

```bash
# After migrate, ingest PDFs from backend/books (manifest: apps/knowledge/data/books_manifest.json)
python manage.py ingest_books
```

Dry run (no DB writes):

```bash
python manage.py ingest_books --dry-run
```

## Operations

- Re-run **`ingest_books`** after adding or replacing PDFs in `backend/books/`.
- Update **`books_manifest.json`** with `book_title`, `author`, `publication_year`, `content_type`, and `agent_tags` per filename.
- Managed Postgres (RDS, Supabase, Neon, etc.) must allow `CREATE EXTENSION vector;`.

## Licensing

Ensure you have the rights to store and embed any PDFs used in production.
