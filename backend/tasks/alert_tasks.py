import logging

from django_rq import job

logger = logging.getLogger(__name__)


@job("default")
def send_opportunity_alert(user_id: int, opportunity_id: int):
    from apps.notifications.models import Notification
    from apps.opportunities.models import Opportunity

    try:
        opp = Opportunity.objects.get(id=opportunity_id, user_id=user_id)
    except Opportunity.DoesNotExist:
        logger.warning("Opportunity %s not found for user %s", opportunity_id, user_id)
        return
    Notification.objects.create(
        user_id=user_id,
        title="New opportunity from Scout",
        body=opp.title[:500],
        channel="in_app",
        payload={"opportunity_id": opportunity_id},
    )
