import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  initializing: boolean;
  actionLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const resolveAuthError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected authentication error occurred.';
};

const checkAdminRights = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.is_admin === true;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    setInitializing(true);

    const syncFromSession = async (sessionUser: User | null) => {
      if (!active) return;
      setInitializing(true);

      if (!sessionUser) {
        setUser(null);
        setIsAdmin(false);
        setInitializing(false);
        return;
      }

      try {
        const allowed = await checkAdminRights(sessionUser.id);
        if (!active) return;

        if (!allowed) {
          await supabase.auth.signOut();
          setError('Access denied. Your account is not marked as admin.');
          setUser(null);
          setIsAdmin(false);
        } else {
          setUser(sessionUser);
          setIsAdmin(true);
          setError(null);
        }
      } catch {
        if (!active) return;
        setUser(null);
        setIsAdmin(false);
        setError('Unable to verify admin privileges. Try again in a moment.');
      } finally {
        if (active) setInitializing(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      syncFromSession(data.session?.user ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setActionLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      const createdUser = data.user;
      if (!createdUser) throw new Error('Account created, but no user returned.');

      const allowed = await checkAdminRights(createdUser.id);
      if (!allowed) {
        await supabase.auth.signOut();
        const message = 'Your account is not authorized. Ask an admin to set profiles.is_admin = true for your user.';
        setError(message);
        throw new Error(message);
      }
    } catch (signupError) {
      setError(resolveAuthError(signupError));
      throw signupError;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const logIn = useCallback(async (email: string, password: string) => {
    setActionLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;

      const sessionUser = data.user;
      if (!sessionUser) throw new Error('Signed in, but no user was returned.');

      const allowed = await checkAdminRights(sessionUser.id);
      if (!allowed) {
        await supabase.auth.signOut();
        const message = 'Access denied. Your account is not marked as admin.';
        setError(message);
        setUser(null);
        setIsAdmin(false);
        throw new Error(message);
      }

      setUser(sessionUser);
      setIsAdmin(true);
      setError(null);
    } catch (loginError) {
      setError(resolveAuthError(loginError));
      throw loginError;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const logOut = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;
    } catch (logoutError) {
      setError(resolveAuthError(logoutError));
      throw logoutError;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isAdmin,
      initializing,
      actionLoading,
      error,
      signUp,
      logIn,
      logOut,
      clearError,
    }),
    [user, isAdmin, initializing, actionLoading, error, signUp, logIn, logOut, clearError],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
};
