import time
from django.utils import timezone
from django.db.models import Q
from celery import shared_task
from events.models import Event
from events.parser import parse_yandex_afisha, parse_event_page


@shared_task
def update_events_task(event_type=None):
    urls = [
        ('https://afisha.yandex.ru/kazan/selections/theatre-tatar-play', 'theatre'),
        ('https://afisha.yandex.ru/kazan/selections/concert-tatar-music', 'concert')
    ]
    if event_type:
        urls = [(url, kind) for url, kind in urls if kind == event_type]
    deleted_count = Event.objects.filter(
        Q(date__isnull=False) & 
        Q(date__lt=timezone.now())
    ).delete()[0]
    print(f"Удалено {deleted_count} прошедших мероприятий")

    total_created = 0
    total_updated = 0
    errors = []

    for url, event_type in urls:
        print(f"Обработка {url}...")

        try:
            events_data = parse_yandex_afisha(url, event_type)

            for event_data in events_data:
                if not event_data['date'] or event_data['date'] < timezone.now():
                    continue

                if event_data.get('source_url'):
                    details = parse_event_page(
                        event_data['source_url']
                    )
                    event_data.update(details)

                obj, created = Event.objects.update_or_create(
                    external_id=event_data['external_id'],
                    defaults={
                        'title': event_data['title'],
                        'description': event_data.get('description', ''),
                        'date': event_data['date'],
                        'venue': event_data['venue'],
                        'price': event_data.get('price', ''),
                        'image_url': event_data.get('image_url', ''),
                        'event_type': event_data['event_type'],
                        'source_url': event_data['source_url']
                    }
                )

                if created:
                    total_created += 1
                else:
                    total_updated += 1

                time.sleep(1)

        except Exception as e:
            print(f"Ошибка при обработке {url}: {e}")
            errors.append(str(e))

    if errors:
        raise RuntimeError("Не удалось обновить все источники: " + "; ".join(errors))

    return {
        'deleted_old': deleted_count,
        'created': total_created,
        'updated': total_updated
    }
