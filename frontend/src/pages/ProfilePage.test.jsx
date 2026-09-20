import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfilePage from './ProfilePage';

jest.mock('../contexts/AuthContext', () => {
  const user = { email: 'student@example.com', role: 'user' };
  return { useAuth: () => ({ user, access: 'test-token' }) };
});
jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

test('shows a loading error instead of invented courses and grades', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
  try {
    render(<ProfilePage />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Основы татарского языка')).toBeNull();
    expect(screen.queryByText('Тест A1 - Начальный уровень')).toBeNull();
  } finally {
    global.fetch = originalFetch;
  }
});
