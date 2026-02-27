"""
CacheManager — тонкая обёртка над redis-py для кэширования в API views.

Подключается к Redis через env-переменные:
  REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_PASSWORD

Данные хранятся как JSON-строки (decode_responses=True).
"""

import json
import logging
import os

import redis

logger = logging.getLogger(__name__)


class CacheManager:
    """Lazy-init Redis client с методами get/set/exists/delete."""

    def __init__(self):
        self._client: redis.Redis | None = None

    def _get_client(self) -> redis.Redis:
        if self._client is None:
            password = os.getenv("REDIS_PASSWORD") or None
            self._client = redis.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                db=int(os.getenv("REDIS_DB", 0)),
                password=password,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
        return self._client

    def get(self, key: str):
        """Возвращает десериализованное значение или None при промахе/ошибке."""
        try:
            value = self._get_client().get(key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as exc:
            logger.warning("CacheManager.get(%s) error: %s", key, exc)
            return None

    def set(self, key: str, value, ttl: int = 300) -> bool:
        """Сохраняет value как JSON с TTL в секундах. Возвращает True при успехе."""
        try:
            self._get_client().setex(key, ttl, json.dumps(value))
            return True
        except Exception as exc:
            logger.warning("CacheManager.set(%s) error: %s", key, exc)
            return False

    def exists(self, key: str) -> bool:
        """Проверяет наличие ключа в Redis."""
        try:
            return bool(self._get_client().exists(key))
        except Exception as exc:
            logger.warning("CacheManager.exists(%s) error: %s", key, exc)
            return False

    def delete(self, key: str) -> bool:
        """Удаляет ключ из Redis."""
        try:
            self._get_client().delete(key)
            return True
        except Exception as exc:
            logger.warning("CacheManager.delete(%s) error: %s", key, exc)
            return False

    def delete_pattern(self, pattern: str) -> bool:
        """Удаляет все ключи, соответствующие glob-паттерну (осторожно на prod)."""
        try:
            keys = self._get_client().keys(pattern)
            if keys:
                self._get_client().delete(*keys)
            return True
        except Exception as exc:
            logger.warning("CacheManager.delete_pattern(%s) error: %s", pattern, exc)
            return False


# Синглтон для использования во views
cache = CacheManager()
