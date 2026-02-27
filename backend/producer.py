#!/usr/bin/env python3
"""
producer.py — отправляет задачи в RabbitMQ exchange.

Получает credentials RabbitMQ из Vault через API.
Создаёт durable direct exchange 'tataredu'.
Отправляет durable-сообщение с routing key = имя задачи.

Запуск:
  python producer.py update_events
  python producer.py update_events --event-type theatre
  python producer.py update_events --event-type concert

Переменные окружения:
  VAULT_ADDR   — адрес Vault (default: http://127.0.0.1:8200)
  VAULT_TOKEN  — токен Vault (default: root)
  RABBITMQ_HOST — хост RabbitMQ (default: 127.0.0.1)
  RABBITMQ_PORT — порт RabbitMQ (default: 5672)
"""

import argparse
import json
import os
import sys

import pika
import requests

EXCHANGE = "tataredu"
VAULT_ADDR = os.getenv("VAULT_ADDR", "http://127.0.0.1:8200")
VAULT_TOKEN = os.getenv("VAULT_TOKEN", "root")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "127.0.0.1")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))


def get_rabbitmq_creds() -> tuple[str, str]:
    """Получает user/password RabbitMQ из Vault KV v2."""
    resp = requests.get(
        f"{VAULT_ADDR}/v1/secret/data/tataredu/rabbitmq",
        headers={"X-Vault-Token": VAULT_TOKEN},
        timeout=5,
    )
    resp.raise_for_status()
    data = resp.json()["data"]["data"]
    return data["user"], data["password"]


def send_task(task_name: str, params: dict | None = None) -> None:
    """Подключается к брокеру и отправляет задачу в exchange."""
    user, password = get_rabbitmq_creds()
    print(f"[Vault] Credentials получены для пользователя '{user}'")

    credentials = pika.PlainCredentials(user, password)
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            credentials=credentials,
        )
    )
    channel = connection.channel()

    # Durable direct exchange
    channel.exchange_declare(
        exchange=EXCHANGE,
        exchange_type="direct",
        durable=True,
    )

    body = json.dumps({"task": task_name, "params": params or {}})

    # Durable-сообщение (delivery_mode=2)
    channel.basic_publish(
        exchange=EXCHANGE,
        routing_key=task_name,
        body=body,
        properties=pika.BasicProperties(
            delivery_mode=pika.DeliveryMode.Persistent,
            content_type="application/json",
        ),
    )

    print(f"[Producer] Отправлено: task='{task_name}', params={params or {}}")
    connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="TatarEdu RabbitMQ Producer")
    parser.add_argument(
        "task",
        choices=["update_events"],
        help="Имя задачи для выполнения",
    )
    parser.add_argument(
        "--event-type",
        choices=["theatre", "concert"],
        default=None,
        help="Тип событий для парсинга (опционально)",
    )
    args = parser.parse_args()

    params = {}
    if args.event_type:
        params["event_type"] = args.event_type

    try:
        send_task(args.task, params)
    except requests.RequestException as e:
        print(f"[Ошибка] Не удалось получить данные из Vault: {e}", file=sys.stderr)
        sys.exit(1)
    except pika.exceptions.AMQPConnectionError as e:
        print(f"[Ошибка] Не удалось подключиться к RabbitMQ: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
