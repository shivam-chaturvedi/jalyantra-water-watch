import { Link, Navigate } from 'react-router-dom';
import { FullScreenLoader } from './FullScreenLoader';
import { useAuth } from '@/contexts/AuthContext';

type ProtectedRouteProps = {
  children: JSX.Element;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { initializing, user, isAdmin } = useAuth();

  if (initializing) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold text-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground">
          Only admin accounts listed under <code className="font-mono text-xs">/admins/&lt;uid&gt; = true</code> can enter.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-foreground hover:text-foreground"
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return children;
};
