import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types/auth';
import LoadingOverlay from './LoadingOverlay/LoadingOverlay';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { firebaseUser, appUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingOverlay message="Memuat..." />;
  }

  if (!firebaseUser || !appUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Must change the temporary password first before accessing any other page.
  if (appUser.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!allowedRoles.includes(appUser.role)) {
    return <Navigate to={`/${appUser.role}`} replace />;
  }

  return <>{children}</>;
}
