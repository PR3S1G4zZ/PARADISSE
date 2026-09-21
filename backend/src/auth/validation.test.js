import { describe, expect, test } from 'vitest';
import { validateLoginBody, validateRegisterBody } from './validation.js';

describe('auth payload validation', () => {
  test('normalizes email and trims name on register', () => {
    expect(validateRegisterBody({
      name: '  Ana  ',
      email: ' Ana@Example.COM ',
      password: 'Viaje2026',
    })).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'Viaje2026',
    });
  });

  test('rejects a weak or oversized payload', () => {
    expect(validateRegisterBody({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'corto',
    }).error).toMatch(/al menos 8/);

    expect(validateLoginBody({
      email: 'invalido',
      password: 'Viaje2026',
    }).error).toMatch(/correo válido/i);
  });
});
