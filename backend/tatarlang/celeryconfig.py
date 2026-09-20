"""
celeryconfig.py — конфигурация Celery для TatarEdu.

Используется в tatarlang/celery.py:
  app.config_from_object('tatarlang.celeryconfig')
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# -- Брокер и бэкенд результатов
broker_url = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@localhost:5672//")
result_backend = "django-db"

# -- Сериализация
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]

# -- Временная зона
timezone = "Europe/Moscow"
enable_utc = True

# -- Надёжность
task_acks_late = True          # подтверждение после выполнения, не после получения
task_reject_on_worker_lost = True
worker_prefetch_multiplier = 1  # брать по одному заданию

# -- Периодические задачи (beat)
from celery.schedules import crontab  # noqa: E402

beat_schedule = {
    "update-events-daily": {
        "task": "events.tasks.update_events_task",
        "schedule": crontab(hour=2, minute=0),
    },
}
