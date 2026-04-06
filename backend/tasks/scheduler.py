from datetime import datetime

from django_rq import get_scheduler


def setup_scheduled_tasks():
    scheduler = get_scheduler("low")
    for job in scheduler.get_jobs():
        job.delete()

    scheduler.schedule(
        scheduled_time=datetime.utcnow(),
        func="tasks.sync_tasks.sync_all_active_accounts",
        interval=4 * 3600,
        repeat=None,
    )
    scheduler.cron(
        "0 5 * * *",
        func="tasks.scout_tasks.scout_all_active_users",
        queue_name="low",
    )
    scheduler.schedule(
        scheduled_time=datetime.utcnow(),
        func="tasks.market_tasks.refresh_fx_rates",
        interval=900,
        repeat=None,
    )
    scheduler.cron(
        "*/30 9-17 * * 1-5",
        func="tasks.market_tasks.refresh_all_portfolios",
        queue_name="default",
    )
