import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urljoin
from django.utils import timezone


def _extract_schedule_dates(html):
    """Extract event_id -> singleShowtime mapping from Apollo cache in page HTML."""
    date_map = {}
    # Each ActualEvent has: "event":{"__ref":"EventPreview:ID"} and singleShowtime
    for m in re.finditer(
        r'"__ref":"EventPreview:([a-f0-9]+)"[^}]+?"singleShowtime":"([^"]+)"',
        html,
        re.DOTALL,
    ):
        date_map[m.group(1)] = m.group(2)
    # Also try reversed order (singleShowtime before __ref within ~3000 chars)
    for m in re.finditer(r'"singleShowtime":"([^"]+)"', html):
        showtime = m.group(1)
        chunk = html[max(0, m.start() - 3000):m.start()]
        ref_match = re.search(r'"__ref":"EventPreview:([a-f0-9]+)"', chunk)
        if ref_match and ref_match.group(1) not in date_map:
            date_map[ref_match.group(1)] = showtime
    return date_map


def parse_yandex_afisha(url, event_type):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    # Build event_id -> ISO datetime map from embedded Apollo cache
    schedule_dates = _extract_schedule_dates(response.text)

    events = []
    event_cards = soup.find_all('div', {'data-component': 'EventCard'})

    for card in event_cards:
        try:
            external_id = card.get('data-event-id')
            title = card.find('h2', {'data-test-id': 'eventCard.eventInfoTitle'}).get_text(strip=True)

            # Parse date from Apollo cache ISO datetime
            date = None
            iso_dt = schedule_dates.get(external_id)
            if iso_dt:
                try:
                    naive_date = datetime.fromisoformat(iso_dt)
                    date = timezone.make_aware(naive_date, timezone.get_current_timezone())
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


def parse_event_page(url, headers):
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')

        description = ''
        desc_block = soup.find('div', {'data-component': 'EventInfo_Description'})
        if desc_block:
            description = desc_block.get_text(strip=True, separator='\n')

        print(description)

        return {'description': description}
    except Exception as e:
        print(f"Ошибка при парсинге страницы события: {e}")
        return {}
