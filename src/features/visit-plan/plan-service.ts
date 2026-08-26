import type { StorageAdapter } from '../../shared/lib/storage';
import type { VisitPlan } from '../../shared/types/domain';

const PLAN_KEY = 'paradisse.plan';
const EMPTY_PLAN: VisitPlan = { favorites: [], municipalities: [], experiences: [] };

const clonePlan = (plan: VisitPlan): VisitPlan => ({
  favorites: [...plan.favorites],
  municipalities: [...plan.municipalities],
  experiences: [...plan.experiences],
});

export const createPlanService = (storage: StorageAdapter) => {
  const getPlan = (): VisitPlan => clonePlan(storage.get<VisitPlan>(PLAN_KEY, EMPTY_PLAN));
  const save = (plan: VisitPlan): VisitPlan => {
    const next = clonePlan(plan);
    storage.set(PLAN_KEY, next);
    return next;
  };

  return {
    getPlan,
    toggleFavorite: (experienceId: string): VisitPlan => {
      const plan = getPlan();
      const favorites = plan.favorites.includes(experienceId)
        ? plan.favorites.filter((id) => id !== experienceId)
        : [...plan.favorites, experienceId];
      return save({ ...plan, favorites });
    },
    addExperience: (experienceId: string): VisitPlan => {
      const plan = getPlan();
      const experiences = plan.experiences.includes(experienceId)
        ? plan.experiences
        : [...plan.experiences, experienceId];
      return save({ ...plan, experiences });
    },
  };
};
