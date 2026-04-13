import django.contrib.postgres.fields
from django.db import migrations, models
from pgvector.django import VectorField


def create_vector_extension(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("CREATE EXTENSION IF NOT EXISTS vector;")


class Migration(migrations.Migration):
    initial = True

    dependencies: list[tuple[str, str]] = []

    operations = [
        migrations.RunPython(create_vector_extension, migrations.RunPython.noop),
        migrations.CreateModel(
            name="KnowledgeChunk",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("content", models.TextField()),
                ("embedding", VectorField(dimensions=1024)),
                ("book_title", models.CharField(max_length=512)),
                ("author", models.CharField(blank=True, max_length=512)),
                ("publication_year", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("chapter", models.CharField(blank=True, max_length=512)),
                (
                    "content_type",
                    models.CharField(
                        blank=True,
                        help_text="principle | framework | history | case_study",
                        max_length=64,
                    ),
                ),
                (
                    "agent_tags",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(max_length=64),
                        blank=True,
                        default=list,
                        help_text="Specialist keys allowed to retrieve this chunk",
                        size=None,
                    ),
                ),
                (
                    "is_time_sensitive",
                    models.BooleanField(
                        default=False,
                        help_text="Book corpus should stay false; filter excludes true at retrieval",
                    ),
                ),
                ("source_path", models.CharField(db_index=True, max_length=1024)),
                ("chunk_index", models.PositiveIntegerField(default=0)),
                ("embedding_model", models.CharField(default="mistral-embed", max_length=128)),
                ("extra", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["source_path", "chunk_index"],
            },
        ),
        migrations.AddIndex(
            model_name="knowledgechunk",
            index=models.Index(fields=["source_path", "chunk_index"], name="knowledge_src_chunk_idx"),
        ),
    ]
