import type { StorageAdapter } from '../../shared/lib/storage';
import type { UserSession } from '../../shared/types/domain';

const SESSION_KEY = 'paradisse.session';
const USERS_KEY = 'paradisse.local-users';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

interface StoredUser extends UserSession {
  password: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const createAuthService = (storage: StorageAdapter) => ({
  registerLocal: ({ name, email, password }: RegisterInput): UserSession => {
    const users = storage.get<StoredUser[]>(USERS_KEY, []);
    const normalizedEmail = normalizeEmail(email);
    const existing = users.find((user) => normalizeEmail(user.email) === normalizedEmail);
    if (existing) {
      throw new Error('El correo ya está registrado');
    }

    const user: StoredUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      password,
    };
    storage.set(USERS_KEY, [...users, user]);
    const session: UserSession = { id: user.id, name: user.name, email: user.email };
    storage.set(SESSION_KEY, session);
    return session;
  },

  signInLocal: ({ email, password }: SignInInput): UserSession | null => {
    const normalizedEmail = normalizeEmail(email);
    const user = storage.get<StoredUser[]>(USERS_KEY, []).find(
      (candidate) => normalizeEmail(candidate.email) === normalizedEmail && candidate.password === password,
    );
    if (!user) return null;
    const session: UserSession = { id: user.id, name: user.name, email: normalizedEmail };
    storage.set(SESSION_KEY, session);
    return session;
  },

  signOut: (): void => storage.remove(SESSION_KEY),

  getSession: (): UserSession | null => storage.get<UserSession | null>(SESSION_KEY, null),
});
