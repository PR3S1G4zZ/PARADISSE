import { describe, expect, test } from 'vitest';
import { hashPassword, verifyPassword, createSessionToken, hashSessionToken } from './crypto.js';

describe('auth crypto', () => {
  test('hashes passwords with argon2id and verifies them', async () => {
    const hash = await hashPassword('Viaje2026');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword('Viaje2026', hash)).toBe(true);
    expect(await verifyPassword('otra', hash)).toBe(false);
  });

  test('hashes opaque session tokens instead of storing them raw', () => {
    const token = createSessionToken();
    const hashed = hashSessionToken(token);
    expect(hashed).not.toBe(token);
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
  });
});
