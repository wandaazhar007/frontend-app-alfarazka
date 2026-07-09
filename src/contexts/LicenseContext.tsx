import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import type { LicenseStatus } from '../types/license';

interface LicenseContextValue {
  license: LicenseStatus | null;
  loading: boolean;
  isLocked: boolean;
  refetch: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!appUser) {
      setLicense(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get<LicenseStatus>('/api/license/status');
      setLicense(data);
    } catch {
      setLicense(null);
    } finally {
      setLoading(false);
    }
  }, [appUser]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const isLocked = !appUser?.isVendor && !license?.devBypass && license !== null && license.status !== 'active';

  return (
    <LicenseContext.Provider value={{ license, loading, isLocked, refetch }}>{children}</LicenseContext.Provider>
  );
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return ctx;
}
