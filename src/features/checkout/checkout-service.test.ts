import type { StorageAdapter } from '../../shared/lib/storage';
import { createAuthService } from '../auth/auth-service';
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

test('confirms a local reservation with the selected method', () => {
  const storage = memoryStorage();
  createAuthService(storage).registerLocal({ name: 'Ana', email: 'ana@example.com', password: 'secreto1' });
  createPlanService(storage).addExperience('jardin-cafe');

  const result = createCheckoutService(storage).confirmLocalCheckout('tarjeta');

  expect(result.method).toBe('tarjeta');
  expect(result.status).toBe('local-confirmed');
});

test('persists a local confirmation so a new service can rehydrate it', () => {
  const storage = memoryStorage();
  createAuthService(storage).registerLocal({ name: 'Ana', email: 'ana@example.com', password: 'secreto1' });
  createPlanService(storage).addExperience('jardin-cafe');
  const contact = { name: 'Ana Pérez', email: 'ana@example.com', phone: '3001234567' };

  const confirmation = createCheckoutService(storage).confirmLocalCheckout('transferencia', contact);
  const rehydrated = createCheckoutService(storage).getConfirmation();

  expect(rehydrated).toEqual(confirmation);
  expect(rehydrated?.contact).toEqual(contact);
  expect(rehydrated?.plan.experiences).toEqual(['jardin-cafe']);
});
