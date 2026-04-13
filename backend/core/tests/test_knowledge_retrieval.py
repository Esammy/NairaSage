"""Tests for Tier-1 knowledge formatting and (optional) Postgres retrieval."""

from django.db import connection
from django.test import SimpleTestCase, TestCase

from apps.knowledge.retrieval import format_passages_for_prompt, retrieve_knowledge


class FormatPassagesTests(SimpleTestCase):
    def test_format_includes_title_and_content(self) -> None:
        chunks = [
            {
                "content": "Compound interest is the eighth wonder.",
                "book_title": "Example Book",
                "author": "A. Author",
                "publication_year": 1999,
                "chapter": "Ch. 1",
            }
        ]
        out = format_passages_for_prompt(chunks)
        self.assertIn("Example Book", out)
        self.assertIn("A. Author", out)
        self.assertIn("Ch. 1", out)
        self.assertIn("Compound interest", out)


class RetrieveKnowledgeVendorTests(TestCase):
    def test_returns_empty_when_not_postgres(self) -> None:
        if connection.vendor == "postgresql":
            self.skipTest("SQLite-only assertion")
        self.assertEqual(retrieve_knowledge("compound interest", "education", k=3), [])


class RoutingPromptRAGTests(SimpleTestCase):
    def test_routing_mentions_researcher(self) -> None:
        from agents.coordinator_prompts import ROUTING_SYSTEM_PROMPT

        self.assertIn("researcher", ROUTING_SYSTEM_PROMPT.lower())

    def test_synthesis_evidence_layers(self) -> None:
        from agents.coordinator_prompts import SYNTHESIS_SYSTEM_PROMPT

        low = SYNTHESIS_SYSTEM_PROMPT.lower()
        self.assertIn("evidence layers", low)
        self.assertIn("web-derived", low)
