import { describe, expect, it } from 'vitest';
import { normalizedProjectName } from './branding';

describe('App public project name fallback', () => {
  it('accepts the validated Unicode display name', () => {
    expect(normalizedProjectName('  Démonstration  ')).toBe('Démonstration');
  });
  it('rejects malformed names', () => {
    for (const value of [undefined, false, ' ', 'bad\nname', 'x'.repeat(121)])
      expect(normalizedProjectName(value)).toBe('SymSvel');
  });
});
