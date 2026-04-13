from django.contrib.postgres.fields import ArrayField
from django.db import models
from pgvector.django import VectorField


class KnowledgeChunk(models.Model):
    """
    Tier-1 book chunk with pgvector embedding. Use only on PostgreSQL (pgvector).
    """

    content = models.TextField()
    embedding = VectorField(dimensions=1024)

    book_title = models.CharField(max_length=512)
    author = models.CharField(max_length=512, blank=True)
    publication_year = models.PositiveSmallIntegerField(null=True, blank=True)
    chapter = models.CharField(max_length=512, blank=True)
    content_type = models.CharField(
        max_length=64,
        blank=True,
        help_text="principle | framework | history | case_study",
    )

    agent_tags = ArrayField(
        models.CharField(max_length=64),
        default=list,
        blank=True,
        help_text="Specialist keys allowed to retrieve this chunk",
    )
    is_time_sensitive = models.BooleanField(
        default=False,
        help_text="Book corpus should stay false; filter excludes true at retrieval",
    )

    source_path = models.CharField(max_length=1024, db_index=True)
    chunk_index = models.PositiveIntegerField(default=0)
    embedding_model = models.CharField(max_length=128, default="mistral-embed")
    extra = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["source_path", "chunk_index"]
        indexes = [
            models.Index(fields=["source_path", "chunk_index"], name="knowledge_src_chunk_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.book_title}#{self.chunk_index}"
