import { describe, expect, it } from 'vitest';
import { isPublicAppRoute } from './public-routes';

describe('App public routes', () => {
  it.each(['/', '/login', '/register', '/activate', '/forgot-password', '/reset-password', '/verify-email', '/verify-email-change', '/two-factor', '/register/'])('keeps %s outside the shell', (path) => {
    expect(isPublicAppRoute(path)).toBe(true);
  });
  it.each(['/dashboard', '/profile', '/future-module'])('protects %s with the shell', (path) => {
    expect(isPublicAppRoute(path)).toBe(false);
  });
});
