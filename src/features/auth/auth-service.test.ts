import { expect, test, vi } from 'vitest';
import type { StorageAdapter } from '../../shared/lib/storage';
import { createAuthService, clearLegacyLocalAuth, LEGACY_SESSION_KEY, LEGACY_USERS_KEY } from './auth-service';

const memoryStorage = (): StorageAdapter => {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string, fallback: T) => (values.has(key) ? values.get(key) as T : fallback),
    set: <T>(key: string, value: T) => { values.set(key, value); },
    remove: (key: string) => { values.delete(key); },
  };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('register creates an authenticated session through the API', async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
    id: 'user-1',
    name: 'Ana',
    email: 'ana@example.com',
  }, 201));
  vi.stubGlobal('fetch', fetchMock);

  const session = await createAuthService().register({
    name: 'Ana',
    email: 'ana@example.com',
    password: 'Viaje2026',
  });

  expect(session.email).toBe('ana@example.com');
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/api\/auth\/register$/);
  expect(init.credentials).toBe('include');
  expect(JSON.parse(init.body)).toEqual({
    name: 'Ana',
    email: 'ana@example.com',
    password: 'Viaje2026',
  });
  vi.unstubAllGlobals();
});

test('normalizes email addresses before login', async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
    id: 'user-1',
    name: 'Ana',
    email: 'ana@example.com',
  }));
  vi.stubGlobal('fetch', fetchMock);

  await createAuthService().signIn({ email: ' ANA@example.com ', password: 'Viaje2026' });

  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    email: 'ANA@example.com',
    password: 'Viaje2026',
  });
  expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  vi.unstubAllGlobals();
});

test('reads the session from GET /api/auth/me', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
    id: 'user-1',
    name: 'Ana',
    email: 'ana@example.com',
  })));

  await expect(createAuthService().getSession()).resolves.toEqual({
    id: 'user-1',
    name: 'Ana',
    email: 'ana@example.com',
  });
  vi.unstubAllGlobals();
});

test('wipes plaintext local account keys after migration', () => {
  const storage = memoryStorage();
  storage.set(LEGACY_USERS_KEY, [{ email: 'ana@example.com', password: 'secreto1' }]);
  storage.set(LEGACY_SESSION_KEY, { id: 'local', name: 'Ana', email: 'ana@example.com' });

  expect(clearLegacyLocalAuth(storage)).toEqual({ hadLocalAccounts: true });
  expect(storage.get(LEGACY_USERS_KEY, 'kept')).toBe('kept');
  expect(storage.get(LEGACY_SESSION_KEY, 'kept')).toBe('kept');
});
