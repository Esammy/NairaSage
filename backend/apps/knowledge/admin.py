from django.contrib import admin

from apps.knowledge.models import KnowledgeChunk


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ("book_title", "chunk_index", "source_path", "embedding_model", "created_at")
    list_filter = ("embedding_model", "book_title")
    search_fields = ("book_title", "author", "source_path", "content")
