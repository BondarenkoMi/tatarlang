import { API_BASE_URL, mediaUrl } from './api';

test('defaults to the current host API', () => {
  expect(API_BASE_URL).toBe('/api/v1');
});

test('resolves uploaded media while preserving absolute URLs', () => {
  expect(mediaUrl('/media/courses/photo.jpg')).toBe(`${window.location.origin}/media/courses/photo.jpg`);
  expect(mediaUrl('https://cdn.example.com/photo.jpg')).toBe('https://cdn.example.com/photo.jpg');
  expect(mediaUrl(null)).toBeNull();
});
