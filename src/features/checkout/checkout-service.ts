import { createAuthService } from '../auth/auth-service';
import { createPlanService } from '../visit-plan/plan-service';
import type { StorageAdapter } from '../../shared/lib/storage';
import type { UserSession, VisitPlan } from '../../shared/types/domain';

export type CheckoutMethod = 'tarjeta' | 'transferencia' | 'efectivo';

export interface LocalCheckoutConfirmation {
  status: 'local-confirmed';
  method: CheckoutMethod;
  session: UserSession;
  plan: VisitPlan;
}

export const createCheckoutService = (storage: StorageAdapter) => {
  const { getSession } = createAuthService(storage);
  const { getPlan } = createPlanService(storage);

  return {
    getSession,
    getPlan,
    confirmLocalCheckout: (method: CheckoutMethod): LocalCheckoutConfirmation => {
      const session = getSession();
      if (!session) {
        throw new Error('Debes iniciar sesión antes de confirmar tu reserva.');
      }

      return { status: 'local-confirmed', method, session, plan: getPlan() };
    },
  };
};
