import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Plus, 
  Pencil, 
  Trash2, 
  Image, 
  Tag, 
  Users,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  diff: any;
  created_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

interface AuditLogPanelEnhancedProps {
  eventId: string;
  floorplanId?: string;
  onSelectStand?: (id: string) => void;
}

export function AuditLogPanelEnhanced({
  eventId,
  floorplanId,
  onSelectStand,
}: AuditLogPanelEnhancedProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [eventId, floorplanId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (floorplanId) {
        query = query.eq('floorplan_id', floorplanId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch user info for each unique user_id
      const userIds = [...new Set((data || []).map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedLogs = (data || []).map(log => ({
        ...log,
        user_name: profileMap.get(log.user_id)?.name,
        user_email: profileMap.get(log.user_id)?.email,
      }));

      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('add')) {
      return <Plus className="w-3 h-3" />;
    }
    if (action.includes('update') || action.includes('edit')) {
      return <Pencil className="w-3 h-3" />;
    }
    if (action.includes('delete') || action.includes('remove')) {
      return <Trash2 className="w-3 h-3" />;
    }
    if (action.includes('background')) {
      return <Image className="w-3 h-3" />;
    }
    if (action.includes('label')) {
      return <Tag className="w-3 h-3" />;
    }
    if (action.includes('bulk')) {
      return <Users className="w-3 h-3" />;
    }
    return <RefreshCw className="w-3 h-3" />;
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      'stand.create': 'Stand aangemaakt',
      'stand.update': 'Stand gewijzigd',
      'stand.delete': 'Stand verwijderd',
      'stand.bulk_update': 'Bulk update',
      'stand.labels_generated': 'Labels gegenereerd',
      'floorplan.background_upload': 'Achtergrond geüpload',
      'floorplan.update': 'Plattegrond gewijzigd',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    if (action.includes('create') || action.includes('add')) return 'default';
    if (action.includes('delete') || action.includes('remove')) return 'destructive';
    if (action.includes('bulk')) return 'secondary';
    return 'outline';
  };

  const formatDiff = (diff: Record<string, any> | null): string | null => {
    if (!diff) return null;
    const parts: string[] = [];
    
    if (diff.label) parts.push(`Label: ${diff.label}`);
    if (diff.status) parts.push(`Status: ${diff.status}`);
    if (diff.count) parts.push(`${diff.count} items`);
    if (diff.prefix) parts.push(`Prefix: ${diff.prefix}`);
    
    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <History className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">Geen activiteit</p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Wijzigingen aan de plattegrond worden hier gelogd
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4" />
          Activiteit
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const diffText = formatDiff(log.diff);
              const canClick = log.entity_type === 'stand' && log.entity_id && onSelectStand;
              
              return (
                <button
                  key={log.id}
                  onClick={() => canClick && onSelectStand?.(log.entity_id!)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                    canClick ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  disabled={!canClick}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Badge variant={getActionColor(log.action)} className="h-5 w-5 p-0 justify-center">
                        {getActionIcon(log.action)}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getActionLabel(log.action)}
                        </span>
                      </div>
                      {diffText && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {diffText}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {log.user_name || log.user_email || 'Onbekend'}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: nl })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
