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

test('adding the same municipality twice persists it once', () => {
  const plan = createPlanService(memoryStorage());

  plan.addMunicipality('jardin');
  plan.addMunicipality('jardin');

  expect(plan.getPlan().municipalities).toEqual(['jardin']);
});

test('adding the same experience twice persists it once', () => {
  const plan = createPlanService(memoryStorage());

  plan.addExperience('jardin-cafe');
  plan.addExperience('jardin-cafe');

  expect(plan.getPlan().experiences).toEqual(['jardin-cafe']);
});

test('hydrates legacy plans with an empty sites collection', () => {
  const storage = memoryStorage();
  storage.set('paradisse.plan', {
    favorites: ['jardin'],
    municipalities: ['jardin'],
    experiences: ['jardin-cafe'],
  });
  const plan = createPlanService(storage);

  expect(plan.getPlan()).toEqual({
    favorites: ['jardin'],
    municipalities: ['jardin'],
    sites: [],
    experiences: ['jardin-cafe'],
  });
});

test('adds a site to the visit plan without duplicating it', () => {
  const plan = createPlanService(memoryStorage());

  plan.addSite('sena-calatrava');
  plan.addSite('sena-calatrava');

  expect(plan.getPlan().sites).toEqual(['sena-calatrava']);
});
