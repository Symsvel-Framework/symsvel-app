import { expect, test } from '@playwright/test';

const access = 'a'.repeat(43);
const refresh = 'b'.repeat(43);
const tokens = {
  access_token: access,
  refresh_token: refresh,
  expires_at: '2099-01-01T00:00:00+00:00',
  refresh_expires_at: '2099-02-01T00:00:00+00:00',
  token_type: 'Bearer'
};

test('verified App login checks session and signs out with matching credentials', async ({ page }) => {
  const calls: { path: string; authorization?: string }[] = [];
  await page.route('**/apiopen/auth/login*', async (route) => {
    const request = route.request();
    calls.push({ path: 'login', authorization: request.headers()['authorization'] });
    expect(request.postDataJSON()).toEqual({
      email: 'user@example.test', password: 'correct-password-123'
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tokens) });
  });
  await page.route('**/api/auth/me*', async (route) => {
    calls.push({ path: 'me', authorization: route.request().headers()['authorization'] });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: 7, context: 'app'
    }) });
  });
  await page.route('**/api/auth/logout*', async (route) => {
    calls.push({ path: 'logout', authorization: route.request().headers()['authorization'] });
    await route.fulfill({ status: 204 });
  });

  await page.goto('/login');
  await page.getByLabel('Email address').fill('user@example.test');
  await page.getByLabel('Password').fill('correct-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('App session verified.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(calls.filter((c) => c.path === 'login')).toEqual([{ path: 'login', authorization: undefined }]);
  expect(calls.filter((c) => c.path === 'me').length).toBeGreaterThan(0);
  expect(calls.filter((c) => c.path === 'me').every((c) => c.authorization === 'Bearer ' + access)).toBe(true);
  expect(calls.find((c) => c.path === 'logout')?.authorization).toBe('Bearer ' + access);
});

test('a refused login never creates an App session', async ({ page }) => {
  await page.route('**/apiopen/auth/login*', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({
      error: { code: 'invalid_credentials' }
    }) });
  });
  await page.goto('/login');
  await page.getByLabel('Email address').fill('user@example.test');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  await expect(page).toHaveURL(/\/login$/);
});

test('mailbox confirmation removes the token from the browser URL and posts anonymously', async ({ page }) => {
  const token = 'z'.repeat(43);
  let posted: unknown = null;
  await page.route('**/apiopen/auth/email-verification/complete*', async (route) => {
    expect(route.request().headers()['authorization']).toBeUndefined();
    posted = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      status: 'completed'
    }) });
  });
  await page.goto('/verify-email?token=' + token);
  await expect(page).toHaveURL(/\/verify-email$/);
  await expect(page.getByText('Your email is verified.')).toBeVisible();
  expect(posted).toEqual({ token });
});

test('unverified App accounts can request another confirmation without exposing their existence', async ({ page }) => {
  await page.route('**/apiopen/auth/email-verification/request*', async (route) => {
    expect(route.request().headers()['authorization']).toBeUndefined();
    expect(route.request().postDataJSON()).toEqual({
      email: 'pending@example.test', locale: 'en'
    });
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({
      status: 'accepted'
    }) });
  });
  await page.goto('/verify-email');
  await page.getByLabel('Email address').fill('pending@example.test');
  await page.getByRole('button', { name: 'Request new link' }).click();
  await expect(page.getByRole('status')).toContainText('If the account is pending');
});
