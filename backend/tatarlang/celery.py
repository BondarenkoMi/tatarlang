import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tatarlang.settings")

app = Celery("tatarlang")

# Конфигурация из celeryconfig.py (брокер, сериализация, роутинг, beat)
app.config_from_object("tatarlang.celeryconfig")

app.autodiscover_tasks()
