"""Regression checks for coordinator prompts (golden / policy strings)."""

from django.test import SimpleTestCase

from agents.coordinator_prompts import ROUTING_SYSTEM_PROMPT, SYNTHESIS_SYSTEM_PROMPT


class CoordinatorPromptGoldenTests(SimpleTestCase):
    def test_routing_prompt_forbids_user_leakage(self) -> None:
        self.assertIn("INTERNAL ONLY", ROUTING_SYSTEM_PROMPT)
        self.assertIn("JSON", ROUTING_SYSTEM_PROMPT)
        self.assertIn("researcher", ROUTING_SYSTEM_PROMPT.lower())

    def test_synthesis_identity_block(self) -> None:
        self.assertIn("VOICE & OPENING", SYNTHESIS_SYSTEM_PROMPT)
        self.assertIn("NairaSage", SYNTHESIS_SYSTEM_PROMPT)
        lowered = SYNTHESIS_SYSTEM_PROMPT.lower()
        self.assertIn("never use the words", lowered)
        self.assertIn("coordinator", lowered)
        self.assertIn("do not greet", lowered)

    def test_synthesis_conflict_pattern(self) -> None:
        self.assertIn("concrete next check", SYNTHESIS_SYSTEM_PROMPT.lower())

    def test_synthesis_nigeria_numeric_calibration(self) -> None:
        self.assertIn("NGN", SYNTHESIS_SYSTEM_PROMPT)
        self.assertIn("literacy score", SYNTHESIS_SYSTEM_PROMPT.lower())

    def test_synthesis_requires_specific_numbers(self) -> None:
        self.assertIn("BE SPECIFIC", SYNTHESIS_SYSTEM_PROMPT)
