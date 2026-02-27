#!/usr/bin/env python3
"""
consumer.py — слушает очередь RabbitMQ и выполняет задачи.

Получает credentials RabbitMQ из Vault через API.
Создаёт durable очередь и биндит её к exchange 'tataredu'.
Callback выполняет задачу и сохраняет результат в JSON-файл.

Запуск:
  python consumer.py update_events

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
import time
from datetime import datetime

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


# =============================================================================
# Task handlers
# =============================================================================

def handle_update_events(params: dict) -> str:
    """
    Парсит Яндекс.Афишу на татарские мероприятия (театр/концерты).
    Сохраняет результат в JSON-файл.
    """
    from bs4 import BeautifulSoup

    urls_config = [
        ("https://afisha.yandex.ru/kazan/selections/theatre-tatar-play", "theatre"),
        ("https://afisha.yandex.ru/kazan/selections/concert-tatar-music", "concert"),
    ]

    event_type_filter = params.get("event_type")
    if event_type_filter:
        urls_config = [(u, t) for u, t in urls_config if t == event_type_filter]

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
    }

    result = {
        "task": "update_events",
        "timestamp": datetime.utcnow().isoformat(),
        "filter": event_type_filter,
        "events": [],
    }

    for url, event_type in urls_config:
        print(f"[Consumer] Парсинг {url}...")
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            soup = BeautifulSoup(resp.text, "html.parser")
            cards = soup.find_all("div", {"data-component": "EventCard"})
            for card in cards:
                title_el = card.find("h2", {"data-test-id": "eventCard.eventInfoTitle"})
                if title_el:
                    result["events"].append({
                        "title": title_el.get_text(strip=True),
                        "type": event_type,
                    })
            time.sleep(1)
        except Exception as e:
            print(f"[Consumer] Ошибка при парсинге {url}: {e}")

    output_file = f"events_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"[Consumer] Сохранено {len(result['events'])} событий в {output_file}")
    return output_file


# Реестр задач: routing_key → handler
TASK_HANDLERS = {
    "update_events": handle_update_events,
}


# =============================================================================
# Consumer
# =============================================================================

def make_callback(channel: pika.channel.Channel):
    """Фабрика callback-функции для basic_consume."""
    def callback(ch, method, properties, body):
        try:
            message = json.loads(body)
        except json.JSONDecodeError:
            print("[Consumer] Некорректный JSON, отклоняем сообщение")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        task_name = message.get("task")
        params = message.get("params", {})
        print(f"[Consumer] Получена задача: {task_name}, params={params}")

        handler = TASK_HANDLERS.get(task_name)
        if not handler:
            print(f"[Consumer] Неизвестная задача '{task_name}', отклоняем")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        try:
            handler(params)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            print(f"[Consumer] Задача '{task_name}' выполнена успешно")
        except Exception as e:
            print(f"[Consumer] Задача '{task_name}' завершилась с ошибкой: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    return callback


def main(queue_name: str) -> None:
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

    # Durable очередь
    channel.queue_declare(queue=queue_name, durable=True)

    # Биндим очередь к exchange с routing_key = queue_name
    channel.queue_bind(
        exchange=EXCHANGE,
        queue=queue_name,
        routing_key=queue_name,
    )

    # Не брать более одного сообщения одновременно
    channel.basic_qos(prefetch_count=1)

    channel.basic_consume(
        queue=queue_name,
        on_message_callback=make_callback(channel),
    )

    print(f"[Consumer] Слушаем очередь '{queue_name}'... CTRL+C для остановки")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()

    connection.close()
    print("[Consumer] Соединение закрыто")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TatarEdu RabbitMQ Consumer")
    parser.add_argument(
        "queue",
        help="Имя очереди для прослушивания (например: update_events)",
    )
    args = parser.parse_args()

    try:
        main(args.queue)
    except requests.RequestException as e:
        print(f"[Ошибка] Не удалось получить данные из Vault: {e}", file=sys.stderr)
        sys.exit(1)
    except pika.exceptions.AMQPConnectionError as e:
        print(f"[Ошибка] Не удалось подключиться к RabbitMQ: {e}", file=sys.stderr)
        sys.exit(1)
