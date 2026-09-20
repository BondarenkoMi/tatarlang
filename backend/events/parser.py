import hashlib
import logging
import os
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.parse import urljoin
from django.utils import timezone
from tatarlang.cache import cache


logger = logging.getLogger(__name__)
EXTERNAL_CACHE_TTL = int(os.getenv('EXTERNAL_CACHE_TTL', '900'))


HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
}


def _get_external_html(url):
    """Возвращает HTML из Redis или загружает и кеширует его на ограниченное время."""
    digest = hashlib.sha256(url.encode('utf-8')).hexdigest()
    cache_key = f'external_html:v1:{digest}'
    cached = cache.get(cache_key)
    if isinstance(cached, dict) and isinstance(cached.get('html'), str):
        logger.info('External cache hit: %s', url)
        return cached['html']

    logger.info('External cache miss: %s', url)
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    cache.set(cache_key, {'html': response.text}, ttl=EXTERNAL_CACHE_TTL)
    return response.text


def _extract_schedule_dates(html):
    """Extract event_id -> singleShowtime mapping from Apollo cache in page HTML."""
    date_map = {}
    for m in re.finditer(
        r'"__ref":"EventPreview:([a-f0-9]+)"[^}]+?"singleShowtime":"([^"]+)"',
        html,
        re.DOTALL,
    ):
        date_map[m.group(1)] = m.group(2)
    for m in re.finditer(r'"singleShowtime":"([^"]+)"', html):
        showtime = m.group(1)
        chunk = html[max(0, m.start() - 3000):m.start()]
        ref_matches = list(re.finditer(r'"__ref":"EventPreview:([a-f0-9]+)"', chunk))
        ref_match = ref_matches[-1] if ref_matches else None
        if ref_match and ref_match.group(1) not in date_map:
            date_map[ref_match.group(1)] = showtime
    return date_map


def parse_yandex_afisha(url, event_type):
    html = _get_external_html(url)
    soup = BeautifulSoup(html, 'html.parser')

    schedule_dates = _extract_schedule_dates(html)

    events = []
    event_cards = soup.find_all('div', {'data-component': 'EventCard'})

    for card in event_cards:
        try:
            external_id = card.get('data-event-id')
            if not external_id:
                continue
            title = card.find('h2', {'data-test-id': 'eventCard.eventInfoTitle'}).get_text(strip=True)

            date = None
            iso_dt = schedule_dates.get(external_id)
            if iso_dt:
                try:
                    date = datetime.fromisoformat(iso_dt.replace('Z', '+00:00'))
                    if timezone.is_naive(date):
                        date = timezone.make_aware(date, ZoneInfo('Europe/Moscow'))
                except (ValueError, AttributeError):
                    date = None

            venue_tag = card.find('a', {'data-test-id': 'eventCard.placeLink'})
            if not venue_tag:
                venue_tag = card.find('a', href=re.compile(r'/kazan/places/'))
            venue = venue_tag.get_text(strip=True) if venue_tag else ''

            price_tag = card.find('span', {'data-test-id': 'eventCard.price'})
            if not price_tag:
                price_tag = card.find(attrs={'data-test-id': re.compile(r'price', re.I)})
            price = price_tag.get_text(strip=True).replace('\xa0', ' ') if price_tag else ''

            img = card.find('img', {'data-test-id': 'eventCard.image'})
            if not img:
                img = card.find('img')
            image_url = (img.get('data-src') or img.get('src', '')) if img else ''

            event_link = card.find('a', {'data-test-id': 'eventCard.link'})
            source_url = urljoin('https://afisha.yandex.ru', event_link.get('href')) if event_link else ''

            events.append({
                'title': title,
                'date': date,
                'venue': venue,
                'price': price,
                'image_url': image_url,
                'event_type': event_type,
                'source_url': source_url,
                'external_id': external_id
            })

        except Exception as e:
            print(f"Ошибка при парсинге карточки: {e}")
            continue

    return events


def parse_event_page(url):
    try:
        soup = BeautifulSoup(_get_external_html(url), 'html.parser')

        description = ''
        desc_block = soup.find('div', {'data-component': 'EventInfo_Description'})
        if desc_block:
            description = desc_block.get_text(strip=True, separator='\n')

        return {'description': description}
    except Exception as e:
        print(f"Ошибка при парсинге страницы события: {e}")
        return {}
