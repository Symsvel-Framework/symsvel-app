import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync(new URL('./dashboard/+page.svelte', import.meta.url), 'utf8');
describe('App profile navigation', () => {
  it('links to Users self-profile from the authenticated dashboard', () => {
    expect(dashboard).toContain("href={resolve('/profile' as Path)}");
    expect(dashboard).toContain('app.users.profile.title');
  });
});
