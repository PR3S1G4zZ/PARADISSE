import { createAuthService } from '../auth/auth-service';
import { createPlanService } from '../visit-plan/plan-service';
import type { StorageAdapter } from '../../shared/lib/storage';
import type { UserSession, VisitPlan } from '../../shared/types/domain';

export type CheckoutMethod = 'tarjeta' | 'transferencia' | 'efectivo';

export interface CheckoutContact {
  name: string;
  email: string;
  phone: string;
}

export interface LocalCheckoutConfirmation {
  status: 'local-confirmed';
  method: CheckoutMethod;
  session: UserSession;
  plan: VisitPlan;
  contact: CheckoutContact;
}

const CONFIRMATION_KEY = 'paradisse.checkout.confirmation';

export const createCheckoutService = (storage: StorageAdapter) => {
  const { getSession } = createAuthService(storage);
  const { getPlan } = createPlanService(storage);

  return {
    getSession,
    getPlan,
    getConfirmation: (): LocalCheckoutConfirmation | null =>
      storage.get<LocalCheckoutConfirmation | null>(CONFIRMATION_KEY, null),
    confirmLocalCheckout: (method: CheckoutMethod, contact?: CheckoutContact): LocalCheckoutConfirmation => {
      const session = getSession();
      if (!session) {
        throw new Error('Debes iniciar sesión antes de confirmar tu reserva.');
      }

      const confirmation: LocalCheckoutConfirmation = {
        status: 'local-confirmed',
        method,
        session,
        plan: getPlan(),
        contact: contact ?? { name: session.name, email: session.email, phone: '' },
      };
      storage.set(CONFIRMATION_KEY, confirmation);
      return confirmation;
    },
  };
};
