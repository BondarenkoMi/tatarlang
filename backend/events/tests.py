from unittest.mock import Mock, patch
from django.test import SimpleTestCase, TestCase
from events.parser import parse_yandex_afisha
from events.tasks import update_events_task


class ParserTests(SimpleTestCase):
    @patch('events.parser.cache.set')
    @patch('events.parser.cache.get', return_value=None)
    @patch('events.parser.requests.get')
    def test_external_response_is_cached(self, get, cache_get, cache_set):
        get.return_value = Mock(text='<html></html>')

        parse_yandex_afisha('https://example.com/events', 'concert')

        cache_get.assert_called_once()
        cache_set.assert_called_once()
        self.assertEqual(cache_set.call_args.kwargs['ttl'], 900)
        get.assert_called_once()

    @patch('events.parser.cache.set')
    @patch('events.parser.cache.get', return_value={'html': '<html></html>'})
    @patch('events.parser.requests.get')
    def test_external_cache_hit_skips_http(self, get, cache_get, cache_set):
        parse_yandex_afisha('https://example.com/events', 'concert')

        cache_get.assert_called_once()
        cache_set.assert_not_called()
        get.assert_not_called()

    def test_dates_with_and_without_timezone(self):
        for value in ['2030-01-02T19:00:00+03:00', '2030-01-02T16:00:00Z', '2030-01-02T19:00:00']:
            html = ('<div data-component="EventCard" data-event-id="abc">'
                    '<h2 data-test-id="eventCard.eventInfoTitle">Concert</h2></div>'
                    f'{{"__ref":"EventPreview:abc","singleShowtime":"{value}"}}')
            with (
                self.subTest(value=value),
                patch('events.parser.cache.get', return_value=None),
                patch('events.parser.cache.set'),
                patch('events.parser.requests.get', return_value=Mock(text=html)) as get,
            ):
                events = parse_yandex_afisha('https://example.com', 'concert')
                self.assertEqual(len(events), 1)
                self.assertIsNotNone(events[0]['date'])
                self.assertIsNotNone(events[0]['date'].tzinfo)
                self.assertNotEqual(get.call_args.kwargs.get('verify'), False)


class EventTaskTests(TestCase):
    @patch('events.tasks.parse_yandex_afisha', side_effect=RuntimeError('Unavailable'))
    def test_source_failures_are_not_reported_as_success(self, parse):
        with self.assertRaises(RuntimeError):
            update_events_task.run()
        self.assertEqual(parse.call_count, 2)

    @patch('events.tasks.parse_yandex_afisha', return_value=[])
    def test_event_type_limits_sources(self, parse):
        result = update_events_task.run(event_type='concert')

        parse.assert_called_once_with(
            'https://afisha.yandex.ru/kazan/selections/concert-tatar-music',
            'concert',
        )
        self.assertEqual(result['created'], 0)
        self.assertEqual(result['updated'], 0)
