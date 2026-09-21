import type { StorageAdapter } from '../../shared/lib/storage';
import { createPlanService } from '../visit-plan/plan-service';
import { createCheckoutService } from './checkout-service';

const memoryStorage = (): StorageAdapter => {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string, fallback: T) => (values.has(key) ? values.get(key) as T : fallback),
    set: <T>(key: string, value: T) => { values.set(key, value); },
    remove: (key: string) => { values.delete(key); },
  };
};

const session = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };

test('confirms a local reservation with the selected method', () => {
  const storage = memoryStorage();
  createPlanService(storage).addExperience('jardin-cafe');

  const result = createCheckoutService(storage).confirmLocalCheckout('tarjeta', undefined, session);

  expect(result.method).toBe('tarjeta');
  expect(result.status).toBe('local-confirmed');
  expect(result.session).toEqual(session);
});

test('persists a local confirmation so a new service can rehydrate it', () => {
  const storage = memoryStorage();
  createPlanService(storage).addExperience('jardin-cafe');
  const contact = { name: 'Ana Pérez', email: 'ana@example.com', phone: '3001234567' };

  const confirmation = createCheckoutService(storage).confirmLocalCheckout('transferencia', contact, session);
  const rehydrated = createCheckoutService(storage).getConfirmation();

  expect(rehydrated).toEqual(confirmation);
  expect(rehydrated?.contact).toEqual(contact);
  expect(rehydrated?.plan.experiences).toEqual(['jardin-cafe']);
});

test('requires an API session before confirming checkout', () => {
  expect(() => createCheckoutService(memoryStorage()).confirmLocalCheckout('tarjeta')).toThrow(
    /iniciar sesión/i,
  );
});
