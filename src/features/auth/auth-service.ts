import { authApi } from '../../shared/lib/api';
import type { StorageAdapter } from '../../shared/lib/storage';
import type { UserSession } from '../../shared/types/domain';

export const LEGACY_SESSION_KEY = 'paradisse.session';
export const LEGACY_USERS_KEY = 'paradisse.local-users';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthService {
  register: (input: RegisterInput) => Promise<UserSession>;
  signIn: (input: SignInInput) => Promise<UserSession>;
  signOut: () => Promise<void>;
  getSession: () => Promise<UserSession | null>;
}

export function clearLegacyLocalAuth(storage: StorageAdapter): { hadLocalAccounts: boolean } {
  const users = storage.get<unknown>(LEGACY_USERS_KEY, null);
  const hadLocalAccounts = Array.isArray(users) && users.length > 0;
  storage.remove(LEGACY_SESSION_KEY);
  storage.remove(LEGACY_USERS_KEY);
  return { hadLocalAccounts };
}

export const createAuthService = (api = authApi): AuthService => ({
  register: ({ name, email, password }: RegisterInput) =>
    api.register({ name: name.trim(), email: email.trim(), password }),
  signIn: ({ email, password }: SignInInput) =>
    api.login({ email: email.trim(), password }),
  signOut: async () => {
    await api.logout();
  },
  getSession: () => api.me(),
});
