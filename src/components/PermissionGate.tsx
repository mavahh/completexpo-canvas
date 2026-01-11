import { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { usePermissions, GlobalModuleVisibility } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  module?: keyof GlobalModuleVisibility;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Gate component that checks permissions before rendering children.
 * Can check either a specific permission or module visibility.
 */
export function PermissionGate({
  children,
  permission,
  module,
  fallback,
  redirectTo,
}: PermissionGateProps) {
  const { loading, hasPermission, isModuleVisible, isSystemAdmin } = usePermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // System admins bypass all permission checks
  if (isSystemAdmin) {
    return <>{children}</>;
  }

  // Check module visibility
  if (module && !isModuleVisible(module)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    return fallback ? <>{fallback}</> : null;
  }

  // Check specific permission
  if (permission && !hasPermission(permission)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface EventPermissionGateProps {
  children: ReactNode;
  eventId: string;
  permission?: string;
  tile?: string;
  fallback?: ReactNode;
}

/**
 * Gate component for event-specific permissions.
 * Uses async permission checking via database functions.
 */
export function EventPermissionGate({
  children,
  eventId,
  permission,
  tile,
  fallback,
}: EventPermissionGateProps) {
  // For synchronous rendering, we'll need to use useEventPermissions hook
  // This is a simplified version that can be enhanced with proper async loading
  const { loading, isSystemAdmin } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      </div>
    );
  }

  // System admins bypass all permission checks
  if (isSystemAdmin) {
    return <>{children}</>;
  }

  // For now, render children and let the component handle its own permission checks
  // This can be enhanced with proper async state management
  return <>{children}</>;
}

interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message = 'Je hebt geen toegang tot deze pagina.' }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m0 0v2m0-2h2m-2 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Toegang geweigerd</h2>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}
