import { expect, test } from '@playwright/test';

test('App reuses the project brand across public routes', async ({ page }) => {
  let requests = 0;
  await page.route('**/apiopen/project', async (route) => {
    requests++;
    expect(route.request().headers()['authorization']).toBeUndefined();
    await route.fulfill({ json: { data: { name: 'Choralys Démo' } } });
  });
  await page.goto('/login');
  await expect(page).toHaveTitle(/Choralys Démo App/);
  await expect(page.locator('header strong')).toHaveText('Choralys Démo');
  await page.locator('a[href$="/forgot-password"]').click();
  await expect(page).toHaveTitle(/Choralys Démo App/);
  await expect(page.locator('header strong')).toHaveText('Choralys Démo');
  expect(requests).toBe(1);
});

test('App falls back if the public brand is unavailable', async ({ page }) => {
  await page.route('**/apiopen/project', (route) => route.fulfill({ status: 503 }));
  await page.goto('/login');
  await expect(page).toHaveTitle(/SymSvel App/);
});

test('app standalone build does not call the optional GDPR API', async ({ page }) => {
	let privacyRequests = 0;
	await page.route('**/apiopen/gdpr/**', (route) => {
		privacyRequests++;
		return route.fulfill({ status: 503 });
	});
	await page.route('**/apiopen/project', (route) =>
		route.fulfill({ json: { data: { name: 'Standalone' } } })
	);
	await page.goto('/login');
	await expect(page).toHaveTitle(/Standalone App/);
	expect(privacyRequests).toBe(0);
});
