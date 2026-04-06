import logging

from django_rq import job

from apps.users.models import FinancialDNA, SkillOutcome, User

logger = logging.getLogger(__name__)


@django_rq.job("low")
def run_opportunity_scout(user_id: int):
    from agents.opportunity_scout.agent import OpportunityScoutAgent

    try:
        agent = OpportunityScoutAgent(user_id=user_id)
        result = agent.run({})
        saved = result.get("saved")
        if saved:
            from tasks.alert_tasks import send_opportunity_alert

            send_opportunity_alert.delay(user_id, saved)
    except Exception as e:  # noqa: BLE001
        logger.exception("Scout failed for user %s: %s", user_id, e)


@job("low")
def scout_all_active_users():
    for uid in User.objects.filter(
        tier__in=["pro", "elite"], is_active=True
    ).values_list("id", flat=True):
        run_opportunity_scout.delay(uid)


@job("low")
def update_routing_weights(user_id: int):
    from collections import defaultdict

    outcomes = SkillOutcome.objects.filter(
        user_id=user_id, was_helpful__isnull=False
    ).values("intent_bucket", "agents_called", "was_helpful")

    bucket_stats = defaultdict(lambda: defaultdict(lambda: {"pos": 0, "neg": 0}))
    for o in outcomes:
        for agent in o["agents_called"] or []:
            if o["was_helpful"]:
                bucket_stats[o["intent_bucket"]][agent]["pos"] += 1
            else:
                bucket_stats[o["intent_bucket"]][agent]["neg"] += 1

    new_weights = {}
    for bucket, agents in bucket_stats.items():
        new_weights[bucket] = {}
        for agent, counts in agents.items():
            total = counts["pos"] + counts["neg"]
            if total >= 3:
                new_weights[bucket][agent] = round(counts["pos"] / total, 3)

    dna = FinancialDNA.objects.get(user_id=user_id)
    dna.routing_weights = new_weights
    dna.save(update_fields=["routing_weights", "updated_at"])
    logger.info("Updated routing weights for user %s", user_id)
