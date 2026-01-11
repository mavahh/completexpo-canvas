import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AuditLogEntry {
  event_id: string;
  floorplan_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  diff?: Record<string, any> | null;
}

export function useAuditLog() {
  const { user } = useAuth();

  const log = async (entry: AuditLogEntry) => {
    if (!user) return;

    try {
      await supabase.from('audit_logs').insert({
        event_id: entry.event_id,
        floorplan_id: entry.floorplan_id || null,
        user_id: user.id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id || null,
        diff: entry.diff || null,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  };

  return { log };
}
