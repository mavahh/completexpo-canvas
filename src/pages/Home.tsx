import { useMemo } from 'react';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { usePermissions, type GlobalModuleVisibility } from '@/hooks/usePermissions';
import { MODULES } from '@/lib/modules';
import { ModuleTile } from '@/components/home/ModuleTile';
import { QuickActionsCard } from '@/components/home/QuickActionsCard';
import { HomeEventSelector } from '@/components/home/HomeEventSelector';
import { HomeSearch } from '@/components/home/HomeSearch';
import { WelcomeCard } from '@/components/home/WelcomeCard';
import { Rocket } from 'lucide-react';

export default function Home() {
  const { eventId, setCurrentEvent } = useCurrentEvent();
  const { hasPermission, isModuleVisible, isSystemAdmin, loading } = usePermissions();

  const visibleModules = useMemo(() => {
    if (loading) return [];
    
    return MODULES.filter((module) => {
      // Coming soon modules are always visible
      if (module.comingSoon) return true;
      
      // Check module visibility
      if (module.requiredModuleVisibility) {
        const isVisible = isModuleVisible(module.requiredModuleVisibility as keyof GlobalModuleVisibility);
        if (!isVisible) return false;
      }
      
      // Check permission
      if (module.requiredPermission) {
        const hasAccess = isSystemAdmin || hasPermission(module.requiredPermission);
        if (!hasAccess) return false;
      }
      
      return true;
    });
  }, [loading, hasPermission, isModuleVisible, isSystemAdmin]);

  const getModuleState = (module: typeof MODULES[0]) => {
    if (module.comingSoon) {
      return { isDisabled: true, reason: 'Coming soon' };
    }
    
    if (module.requiresEvent && !eventId) {
      return { isDisabled: true, reason: 'Selecteer eerst een event' };
    }
    
    return { isDisabled: false, reason: undefined };
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card with Recent Activity */}
      <WelcomeCard />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Selecteer een module om verder te gaan
          </p>
        </div>
        <HomeSearch eventId={eventId} />
      </div>

      {/* Event Selector */}
      <HomeEventSelector 
        selectedEventId={eventId} 
        onEventChange={(id, name, location) => setCurrentEvent(id, name, location)} 
      />

      {/* Quick Actions */}
      <QuickActionsCard eventId={eventId} />

      {/* Module Tiles Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleModules.map((module) => {
            const { isDisabled, reason } = getModuleState(module);
            return (
              <ModuleTile
                key={module.id}
                module={module}
                eventId={eventId}
                isDisabled={isDisabled}
                disabledReason={reason}
              />
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {!loading && visibleModules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Je hebt geen toegang tot modules. Neem contact op met een beheerder.
          </p>
        </div>
      )}
    </div>
  );
}
