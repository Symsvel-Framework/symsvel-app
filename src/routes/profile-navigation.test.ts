import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shell = readFileSync(new URL('../lib/components/AppShell.svelte', import.meta.url), 'utf8');
describe('App profile navigation', () => {
  it('links to Users self-profile from the authenticated shell', () => {
    expect(shell).toContain("href={resolve('/profile' as Path)}");
    expect(shell).toContain('app.users.profile.title');
  });
});

it('does not distribute the temporary remote update probe', () => {
  expect(existsSync(new URL('./ct-remote/+page.svelte', import.meta.url))).toBe(false);
});
