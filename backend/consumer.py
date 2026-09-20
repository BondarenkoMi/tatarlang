import argparse
import json
import os
import sys
from datetime import datetime, timezone

import pika
import requests

EXCHANGE = "tataredu"
VAULT_ADDR = os.getenv("VAULT_ADDR", "http://127.0.0.1:8200")
VAULT_TOKEN = os.getenv("VAULT_TOKEN", "")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "127.0.0.1")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))


def get_rabbitmq_creds() -> tuple[str, str]:
    if not VAULT_TOKEN:
        raise ValueError("Задайте VAULT_TOKEN для доступа к Vault.")

    resp = requests.get(
        f"{VAULT_ADDR}/v1/secret/data/tataredu/rabbitmq",
        headers={"X-Vault-Token": VAULT_TOKEN},
        timeout=5,
    )
    resp.raise_for_status()
    data = resp.json()["data"]["data"]
    return data["user"], data["password"]


def handle_update_events(params: dict) -> str:
    """Получает события общим парсером и сохраняет их в JSON."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tatarlang.settings")

    import django

    django.setup()

    from events.parser import parse_yandex_afisha

    sources = [
        ("https://afisha.yandex.ru/kazan/selections/theatre-tatar-play", "theatre"),
        ("https://afisha.yandex.ru/kazan/selections/concert-tatar-music", "concert"),
    ]
    event_type_filter = params.get("event_type")
    if event_type_filter:
        sources = [(url, kind) for url, kind in sources if kind == event_type_filter]

    events = []
    errors = []
    for url, event_type in sources:
        try:
            events.extend(parse_yandex_afisha(url, event_type))
        except Exception as error:
            errors.append(f"{url}: {error}")

    if errors:
        raise RuntimeError("Не удалось обработать все источники: " + "; ".join(errors))

    result = {
        "task": "update_events",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "filter": event_type_filter,
        "events": events,
    }
    output_file = f"events_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f')}.json"
    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(result, file, ensure_ascii=False, indent=2, default=str)

    print(f"[Consumer] Сохранено {len(events)} событий в {output_file}")
    return output_file



TASK_HANDLERS = {
    "update_events": handle_update_events,
}

def make_callback(channel: pika.channel.Channel):
    """Фабрика callback-функции для basic_consume."""
    def callback(ch, method, properties, body):
        try:
            message = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            print("[Consumer] Некорректный JSON, отклоняем сообщение")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        if not isinstance(message, dict) or not isinstance(message.get("params", {}), dict):
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        task_name = message.get("task")
        params = message.get("params", {})
        print(f"[Consumer] Получена задача: {task_name}, params={params}")

        handler = TASK_HANDLERS.get(task_name) if isinstance(task_name, str) else None
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


    channel.exchange_declare(
        exchange=EXCHANGE,
        exchange_type="direct",
        durable=True,
    )


    channel.queue_declare(queue=queue_name, durable=True)


    channel.queue_bind(
        exchange=EXCHANGE,
        queue=queue_name,
        routing_key=queue_name,
    )


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
    except ValueError as e:
        print(f"[Ошибка] {e}", file=sys.stderr)
        sys.exit(1)
    except requests.RequestException as e:
        print(f"[Ошибка] Не удалось получить данные из Vault: {e}", file=sys.stderr)
        sys.exit(1)
    except pika.exceptions.AMQPConnectionError as e:
        print(f"[Ошибка] Не удалось подключиться к RabbitMQ: {e}", file=sys.stderr)
        sys.exit(1)
