from django.contrib import admin

from apps.billing.models import BillingEvent, Subscription


admin.site.register(Subscription)
admin.site.register(BillingEvent)
