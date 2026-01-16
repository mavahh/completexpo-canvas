import { NavLink, Outlet, useParams } from 'react-router-dom';
import { ShoppingCart, Package, Clock, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosPermissions } from '@/hooks/usePosPermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const posNavItems = [
  { path: '', label: 'Verkoop', icon: ShoppingCart, permission: 'canSell' as const },
  { path: 'products', label: 'Producten', icon: Package, permission: 'canAdmin' as const },
  { path: 'shifts', label: 'Shifts', icon: Clock, permission: 'canOpenShift' as const },
  { path: 'reports', label: 'Rapporten', icon: BarChart3, permission: 'canAdmin' as const },
  { path: 'settings', label: 'Instellingen', icon: Settings, permission: 'canAdmin' as const },
];

export default function PosLayout() {
  const { id: eventId } = useParams<{ id: string }>();
  const { loading, canView, canSell, canAdmin, canOpenShift } = usePosPermissions(eventId || null);

  const permissionMap = {
    canView,
    canSell,
    canAdmin,
    canOpenShift,
  };

  if (loading) {
    return (
      <div className="h-full flex">
        <div className="w-48 border-r bg-muted/30 p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Je hebt geen toegang tot de POS module.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleItems = posNavItems.filter(item => permissionMap[item.permission]);

  return (
    <div className="h-full flex">
      {/* POS Sidebar */}
      <div className="w-48 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">POS</h2>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {visibleItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path === '' ? `/events/${eventId}/pos` : `/events/${eventId}/pos/${item.path}`}
              end={item.path === ''}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
