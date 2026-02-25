import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { get, ref } from 'firebase/database';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';

import { auth, database } from '@/lib/firebaseClient';

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

const checkAdminRights = async (uid: string) => {
  const snapshot = await get(ref(database, `admins/${uid}`));
  return snapshot.val() === true;
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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      setInitializing(true);

      if (!firebaseUser) {
        if (active) {
          setUser(null);
          setIsAdmin(false);
          setInitializing(false);
        }
        return;
      }

      try {
        const allowed = await checkAdminRights(firebaseUser.uid);
        if (!active) return;

        if (!allowed) {
          await signOut(auth);
          setError('Access denied. Your email is not registered under /admins.');
          setUser(null);
          setIsAdmin(false);
        } else {
          setUser(firebaseUser);
          setIsAdmin(true);
          setError(null);
        }
      } catch (authError) {
        if (!active) return;
        setUser(null);
        setIsAdmin(false);
        setError('Unable to verify admin privileges. Try again in a moment.');
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setActionLoading(true);
    setError(null);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const allowed = await checkAdminRights(credential.user.uid);

      if (!allowed) {
        await signOut(auth);
        const message = 'Your account is not authorized. Ask an admin to add your UID under /admins.';
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
      await signInWithEmailAndPassword(auth, email, password);
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
      await signOut(auth);
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
