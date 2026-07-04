from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("wealth", "0002_coach_memory_and_actions"),
    ]

    operations = [
        migrations.AddField(
            model_name="nextaction",
            name="priority",
            field=models.IntegerField(
                db_index=True,
                default=50,
                help_text="Lower values surface first on the cockpit (10 = urgent).",
            ),
        ),
    ]
