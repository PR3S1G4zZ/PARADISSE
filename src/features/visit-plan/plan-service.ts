import type { StorageAdapter } from '../../shared/lib/storage';
import type { VisitPlan } from '../../shared/types/domain';

const PLAN_KEY = 'paradisse.plan';
const EMPTY_PLAN: VisitPlan = { favorites: [], municipalities: [], sites: [], experiences: [] };

const clonePlan = (plan: Partial<VisitPlan>): VisitPlan => ({
  favorites: [...(plan.favorites ?? [])],
  municipalities: [...(plan.municipalities ?? [])],
  sites: [...(plan.sites ?? [])],
  experiences: [...(plan.experiences ?? [])],
});

export const createPlanService = (storage: StorageAdapter) => {
  const getPlan = (): VisitPlan => clonePlan(storage.get<VisitPlan>(PLAN_KEY, EMPTY_PLAN));
  const save = (plan: Partial<VisitPlan>): VisitPlan => {
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
    addMunicipality: (municipalitySlug: string): VisitPlan => {
      const plan = getPlan();
      const municipalities = plan.municipalities.includes(municipalitySlug)
        ? plan.municipalities
        : [...plan.municipalities, municipalitySlug];
      return save({ ...plan, municipalities });
    },
    addSite: (siteSlug: string): VisitPlan => {
      const plan = getPlan();
      const sites = plan.sites.includes(siteSlug)
        ? plan.sites
        : [...plan.sites, siteSlug];
      return save({ ...plan, sites });
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
