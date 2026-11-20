import { describe, expect, it } from 'vitest';
import { authLabels } from './auth';

describe('App auth messages', () => {
  it('selects the UI language with a French fallback', () => {
    expect(authLabels('fr-FR').signIn).toBe('Connexion');
    expect(authLabels('en-US').signIn).toBe('Sign in');
    expect(authLabels(null).signIn).toBe('Connexion');
    expect(authLabels('es-ES').signIn).toBe('Connexion');
  });
});
