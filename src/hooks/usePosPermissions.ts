import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/hooks/usePermissions';

export interface PosPermissions {
  loading: boolean;
  canView: boolean;
  canSell: boolean;
  canOpenShift: boolean;
  canAdmin: boolean;
  refetch: () => Promise<void>;
}

export function usePosPermissions(eventId: string | null): PosPermissions {
  const { user } = useAuth();
  const { isSystemAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canView: false,
    canSell: false,
    canOpenShift: false,
    canAdmin: false,
  });

  const fetchPermissions = useCallback(async () => {
    if (!user || !eventId) {
      setLoading(false);
      return;
    }

    // System admins have all permissions
    if (isSystemAdmin) {
      setPermissions({
        canView: true,
        canSell: true,
        canOpenShift: true,
        canAdmin: true,
      });
      setLoading(false);
      return;
    }

    try {
      const [viewResult, sellResult, shiftResult, adminResult] = await Promise.all([
        supabase.rpc('has_event_permission', {
          _user_id: user.id,
          _event_id: eventId,
          _permission_name: 'POS_VIEW',
        }),
        supabase.rpc('has_event_permission', {
          _user_id: user.id,
          _event_id: eventId,
          _permission_name: 'POS_SELL',
        }),
        supabase.rpc('has_event_permission', {
          _user_id: user.id,
          _event_id: eventId,
          _permission_name: 'POS_SHIFT_OPEN',
        }),
        supabase.rpc('has_event_permission', {
          _user_id: user.id,
          _event_id: eventId,
          _permission_name: 'POS_ADMIN',
        }),
      ]);

      setPermissions({
        canView: viewResult.data === true,
        canSell: sellResult.data === true,
        canOpenShift: shiftResult.data === true,
        canAdmin: adminResult.data === true,
      });
    } catch (error) {
      console.error('Error fetching POS permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, eventId, isSystemAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    loading,
    ...permissions,
    refetch: fetchPermissions,
  };
}
