"""Изолированные тесты: SQLite в памяти, без Redis, RabbitMQ и внешней БД."""
import os
os.environ['DJANGO_SECRET_KEY'] = 'test-only-not-for-running-the-application'
from .settings import *  # noqa: F403, F401

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
REDIS_ENABLED = False
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
