import type { StorageAdapter } from '../../shared/lib/storage';
import { createPlanService } from './plan-service';

const memoryStorage = (): StorageAdapter => {
  const values = new Map<string, unknown>();
  return {
    get: <T>(key: string, fallback: T) => (values.has(key) ? values.get(key) as T : fallback),
    set: <T>(key: string, value: T) => { values.set(key, value); },
    remove: (key: string) => { values.delete(key); },
  };
};

test('adding the same favorite twice removes it', () => {
  const plan = createPlanService(memoryStorage());
  plan.toggleFavorite('jardin');
  plan.toggleFavorite('jardin');
  expect(plan.getPlan().favorites).toEqual([]);
});
