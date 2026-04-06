from django.contrib import admin

from apps.tax.models import TaxDeadline, TaxRecord


admin.site.register(TaxRecord)
admin.site.register(TaxDeadline)
