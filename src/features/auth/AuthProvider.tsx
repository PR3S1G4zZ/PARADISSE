import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createStorageAdapter, type StorageAdapter } from '../../shared/lib/storage';
import type { UserSession } from '../../shared/types/domain';
import {
  clearLegacyLocalAuth,
  createAuthService,
  type AuthService,
  type RegisterInput,
  type SignInInput,
} from './auth-service';

export interface AuthContextValue {
  session: UserSession | null;
  status: 'loading' | 'ready';
  hadLocalAccounts: boolean;
  register: (input: RegisterInput) => Promise<UserSession>;
  signIn: (input: SignInInput) => Promise<UserSession>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  service?: AuthService;
  storage?: StorageAdapter;
  initialSession?: UserSession | null;
}

export function AuthProvider({ children, service, storage, initialSession }: AuthProviderProps) {
  const auth = useMemo(() => service ?? createAuthService(), [service]);
  const store = useMemo(() => storage ?? createStorageAdapter(), [storage]);
  const [hadLocalAccounts] = useState(() => clearLegacyLocalAuth(store).hadLocalAccounts);
  const skipFetch = initialSession !== undefined;
  const [session, setSession] = useState<UserSession | null>(skipFetch ? initialSession : null);
  const [status, setStatus] = useState<'loading' | 'ready'>(skipFetch ? 'ready' : 'loading');

  const refresh = useCallback(async () => {
    try {
      setSession(await auth.getSession());
    } catch {
      setSession(null);
    } finally {
      setStatus('ready');
    }
  }, [auth]);

  useEffect(() => {
    if (skipFetch) return;
    void refresh();
  }, [refresh, skipFetch]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    status,
    hadLocalAccounts,
    register: async (input) => {
      const next = await auth.register(input);
      setSession(next);
      return next;
    },
    signIn: async (input) => {
      const next = await auth.signIn(input);
      setSession(next);
      return next;
    },
    signOut: async () => {
      await auth.signOut();
      setSession(null);
    },
  }), [auth, hadLocalAccounts, session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return value;
}
