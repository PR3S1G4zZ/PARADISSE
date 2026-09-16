import type { StorageAdapter } from '../../shared/lib/storage';
import { createAuthService } from './auth-service';

const memoryStorage = (): StorageAdapter => {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string, fallback: T) => (values.has(key) ? values.get(key) as T : fallback),
    set: <T>(key: string, value: T) => { values.set(key, value); },
    remove: (key: string) => { values.delete(key); },
  };
};

test('register creates a persisted authenticated session', () => {
  const service = createAuthService(memoryStorage());
  expect(service.registerLocal({ name: 'Ana', email: 'ana@example.com', password: 'secreto1' }).email)
    .toBe('ana@example.com');
  expect(service.getSession()?.name).toBe('Ana');
});

test('normalizes email addresses for registration and sign in', () => {
  const service = createAuthService(memoryStorage());
  const registered = service.registerLocal({
    name: 'Ana',
    email: ' Ana@Example.COM ',
    password: 'secreto1',
  });

  expect(registered.email).toBe('ana@example.com');
  expect(service.signInLocal({ email: ' ANA@example.com ', password: 'secreto1' })?.id)
    .toBe(registered.id);
});

test('rejects a duplicate email regardless of casing', () => {
  const service = createAuthService(memoryStorage());
  service.registerLocal({ name: 'Ana', email: 'ana@example.com', password: 'secreto1' });

  expect(() => service.registerLocal({
    name: 'Otra Ana',
    email: 'ANA@EXAMPLE.COM',
    password: 'secreto2',
  })).toThrow(/ya está registrado/i);
});
