import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../services/api';
import type { AppUser } from '../types/auth';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncAppUser = useCallback(async () => {
    try {
      const { data } = await api.post('/api/auth/sync');
      setAppUser(data);
    } catch (err) {
      setAppUser(null);
      setError(err instanceof Error ? err.message : 'Gagal sinkronisasi user');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setError(null);

      if (!fbUser) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      await syncAppUser();
      setLoading(false);
    });

    return unsubscribe;
  }, [syncAppUser]);

  const logout = async () => {
    await signOut(auth);
  };

  // Called after an action that changes the current user's own data (e.g. mandatory
  // password change) so appUser in the context updates too, without needing a page reload.
  const refreshAppUser = async () => {
    await syncAppUser();
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, error, logout, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
