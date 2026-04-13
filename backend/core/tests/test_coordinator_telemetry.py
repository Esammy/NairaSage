from django.test import SimpleTestCase

from agents.telemetry import log_coordinator_turn


class CoordinatorTelemetryTests(SimpleTestCase):
    def test_log_coordinator_turn_emits_metric_line(self) -> None:
        with self.assertLogs("agents.telemetry", level="INFO") as captured:
            log_coordinator_turn(
                phase="test",
                user_id=42,
                intent_bucket="spending_query",
                agents=["accountant"],
                outcome_id=7,
                ms=120,
                response_length=900,
            )
        self.assertTrue(
            any("COORD_METRIC" in m and "phase=test" in m for m in captured.output),
            captured.output,
        )
