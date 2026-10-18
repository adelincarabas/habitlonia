import { ApiError, type LoginInput, type RegisterInput, type ResetPasswordInput, type User } from '@habitlonia/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient, setUnauthorizedHandler } from './api';
import { clearToken, loadToken, saveToken } from './session';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User };

type AuthContextValue = {
  state: AuthState;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  /** Sets a new password with the emailed code and logs in. */
  resetPassword: (input: ResetPasswordInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const signOut = useCallback(async () => {
    await clearToken();
    // Cached data belongs to the previous user.
    queryClient.clear();
    setState({ status: 'signedOut' });
  }, [queryClient]);

  // Restore the saved session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await loadToken();
      if (!token) return setState({ status: 'signedOut' });
      try {
        const user = await apiClient.getMe();
        if (!cancelled) setState({ status: 'signedIn', user });
      } catch {
        // A 401 already cleared the session via the unauthorized handler. If the API is just
        // unreachable, keep the saved token so the next launch can try again.
        if (!cancelled) setState({ status: 'signedOut' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(undefined);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(() => {
    const startSession = async ({ token, user }: { token: string; user: User }) => {
      await saveToken(token);
      setState({ status: 'signedIn', user });
    };
    return {
      state,
      signIn: async (input) => startSession(await apiClient.login(input)),
      signUp: async (input) => startSession(await apiClient.register(input)),
      resetPassword: async (input) => startSession(await apiClient.resetPassword(input)),
      signOut,
    };
  }, [state, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** A message safe to show under a form, for whatever went wrong. */
export function describeAuthError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  // Input rejected by the shared zod schema before any request was sent.
  if (err instanceof Error && err.name === 'ZodError' && 'issues' in err) {
    const issues = err.issues as { message: string }[];
    return issues[0]?.message ?? 'Check the form and try again.';
  }
  // fetch() rejects with a TypeError when the server can't be reached at all.
  if (err instanceof TypeError) return "Can't reach the server. Is `pnpm dev:api` running?";
  return 'Something went wrong. Please try again.';
}
