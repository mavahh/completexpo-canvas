import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type EventRole = 'ADMIN' | 'USER' | null;

export function useEventRole(eventId: string | undefined) {
  const { user } = useAuth();
  const [role, setRole] = useState<EventRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !user) {
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data } = await supabase
        .from('event_members')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      setRole((data?.role as EventRole) || null);
      setLoading(false);
    };

    fetchRole();
  }, [eventId, user]);

  return {
    role,
    loading,
    isAdmin: role === 'ADMIN',
    isReadOnly: role === 'USER',
    canEdit: role === 'ADMIN',
  };
}
