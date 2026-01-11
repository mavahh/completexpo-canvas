import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Activity, 
  MapPin, 
  Users, 
  FileText, 
  Settings,
  LayoutGrid,
  Clock
} from 'lucide-react';

const ACTION_ICONS: Record<string, React.ElementType> = {
  stand: LayoutGrid,
  exhibitor: Users,
  floorplan: MapPin,
  event: FileText,
  settings: Settings,
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'aangemaakt',
  UPDATE: 'bijgewerkt',
  DELETE: 'verwijderd',
  ASSIGN: 'toegewezen',
  UNASSIGN: 'ontkoppeld',
};

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  event_id: string | null;
  events?: { name: string } | null;
}

export function WelcomeCard() {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          created_at,
          event_id,
          events:event_id (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!user?.id,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Goedemorgen';
    if (hour < 18) return 'Goedemiddag';
    return 'Goedenavond';
  };

  const displayName = profile?.name || profile?.email?.split('@')[0] || 'daar';

  const formatActivityMessage = (log: AuditLogEntry) => {
    const actionLabel = ACTION_LABELS[log.action] || log.action.toLowerCase();
    const entityType = log.entity_type.toLowerCase();
    const eventName = log.events?.name;
    
    let message = `${entityType} ${actionLabel}`;
    if (eventName) {
      message += ` in ${eventName}`;
    }
    return message;
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
          {/* Welcome Section */}
          <div className="flex-1">
            {profileLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 sm:h-8 w-40 sm:w-48" />
                <Skeleton className="h-4 w-56 sm:w-64" />
              </div>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {getGreeting()}, {displayName}! 👋
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Welkom terug bij je Command Center.
                </p>
              </>
            )}
          </div>

          {/* Recent Activity Section */}
          <div className="lg:w-80 xl:w-96">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Recente activiteit</h3>
            </div>
            
            {activityLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((log) => {
                  const IconComponent = ACTION_ICONS[log.entity_type.toLowerCase()] || Activity;
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {formatActivityMessage(log)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(log.created_at), { 
                            addSuffix: true, 
                            locale: nl 
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                Nog geen recente activiteit. Begin met het beheren van je events!
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
