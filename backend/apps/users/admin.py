from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.users.models import (
    CoordinatorChatSession,
    FinancialDNA,
    SkillGapReport,
    SkillOutcome,
    User,
    UserGoal,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "username", "tier", "is_staff", "is_active")
    search_fields = ("email", "username")
    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        (
            "NairaSage",
            {"fields": ("phone", "bvn_verified", "tier", "onboarded")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "username", "password1", "password2"),
            },
        ),
    )


admin.site.register(FinancialDNA)
admin.site.register(UserGoal)
admin.site.register(SkillOutcome)
admin.site.register(SkillGapReport)
admin.site.register(CoordinatorChatSession)
