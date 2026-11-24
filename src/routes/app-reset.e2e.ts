import { expect, test } from '@playwright/test';

test('public App recovery request is anonymous and does not enumerate accounts', async ({ page }) => {
  let requests = 0;
  await page.route('**/apiopen/auth/password-reset/request*', async (route) => {
    requests++;
    expect(route.request().headers()['authorization']).toBeUndefined();
    expect(route.request().postDataJSON()).toEqual({
      email: 'user@example.test', locale: 'en'
    });
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ status: 'accepted' }) });
  });
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('user@example.test');
  await page.getByRole('button', { name: 'Request reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If a verified account exists');
  expect(requests).toBe(1);
});

test('App reset page scrubs its token, confirms new password and never sends a Bearer', async ({ page }) => {
  const token = 'c'.repeat(43);
  let requests = 0;
  await page.route('**/apiopen/auth/password-reset/complete*', async (route) => {
    requests++;
    expect(route.request().headers()['authorization']).toBeUndefined();
    expect(route.request().postDataJSON()).toEqual({
      token, password: 'Brand-new-password-123!'
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'completed' }) });
  });
  await page.goto('/reset-password?token=' + token);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel('New password').fill('Brand-new-password-123!');
  await expect(page.locator('.requirements li.met')).toHaveCount(5);
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '4');
  await page.getByLabel('Confirm password').fill('Brand-new-password-123!');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('status')).toContainText('Your password was changed');
  expect(requests).toBe(1);
});
