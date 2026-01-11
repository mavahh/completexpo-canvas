import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { History, Plus, Pencil, Trash2, Wand2, Image, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  diff: Record<string, any> | null;
  created_at: string;
  user_id: string;
}

interface AuditLogPanelProps {
  eventId: string;
  floorplanId?: string;
  onSelectStand?: (standId: string) => void;
}

export function AuditLogPanel({ eventId, floorplanId, onSelectStand }: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [eventId, floorplanId]);

  const fetchLogs = async () => {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (floorplanId) {
      query = query.eq('floorplan_id', floorplanId);
    }

    const { data } = await query;
    if (data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return <Plus className="w-3 h-3" />;
    if (action.includes('update') || action.includes('bulk')) return <Pencil className="w-3 h-3" />;
    if (action.includes('delete')) return <Trash2 className="w-3 h-3" />;
    if (action.includes('label')) return <Wand2 className="w-3 h-3" />;
    if (action.includes('background')) return <Image className="w-3 h-3" />;
    return <RefreshCw className="w-3 h-3" />;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'stand.create': 'Stand aangemaakt',
      'stand.update': 'Stand bijgewerkt',
      'stand.delete': 'Stand verwijderd',
      'stand.bulk_update': 'Bulk update',
      'stand.labels_generated': 'Labels gegenereerd',
      'stand.status_change': 'Status gewijzigd',
      'floorplan.background_upload': 'Achtergrond geüpload',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (action.includes('create')) return 'default';
    if (action.includes('delete')) return 'destructive';
    if (action.includes('bulk')) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-center text-sm text-muted-foreground py-4">
          Laden...
        </div>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-sm text-muted-foreground py-4">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Geen activiteit
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">Activiteit</h4>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-2">
          {logs.map((log) => (
            <button
              key={log.id}
              onClick={() => log.entity_id && onSelectStand?.(log.entity_id)}
              className={`w-full text-left p-2 rounded hover:bg-muted transition-colors ${
                log.entity_id ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-muted-foreground">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={getActionColor(log.action)} className="text-[10px] h-5">
                      {getActionLabel(log.action)}
                    </Badge>
                  </div>
                  {log.diff && (
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">
                      {Object.keys(log.diff).join(', ')}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: nl })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
