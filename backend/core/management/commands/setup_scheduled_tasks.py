from django.core.management.base import BaseCommand

from tasks.scheduler import setup_scheduled_tasks


class Command(BaseCommand):
    help = "Register RQ scheduled jobs (run after deploy and when cron config changes)."

    def handle(self, *args, **options):
        setup_scheduled_tasks()
        self.stdout.write(self.style.SUCCESS("Scheduled tasks registered."))
