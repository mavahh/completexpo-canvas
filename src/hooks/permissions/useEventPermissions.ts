// Event-specific permissions hook

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { 
  EventRole, 
  EventPermissions, 
  TileVisibility, 
  EventMembership,
  EventPermissionsResult 
} from './types';

export function useEventPermissions(eventId: string | undefined): EventPermissionsResult {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<EventMembership | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  useEffect(() => {
    if (!user || !eventId) {
      setLoading(false);
      return;
    }

    const fetchEventPermissions = async () => {
      try {
        // Check system admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role === 'ADMIN') {
          setIsSystemAdmin(true);
          setMembership({
            role: 'ADMIN',
            permissionsOverride: null,
            visibleTiles: null,
          });
          setLoading(false);
          return;
        }

        // Get event membership
        const { data: memberData } = await supabase
          .from('event_members')
          .select('role, permissions_override, visible_tiles')
          .eq('user_id', user.id)
          .eq('event_id', eventId)
          .single();

        if (memberData) {
          setMembership({
            role: memberData.role as EventRole,
            permissionsOverride: memberData.permissions_override as Partial<EventPermissions> | null,
            visibleTiles: memberData.visible_tiles as Partial<TileVisibility> | null,
          });
        } else {
          setMembership(null);
        }
      } catch (error) {
        console.error('Error fetching event permissions:', error);
        setMembership(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEventPermissions();
  }, [user, eventId]);

  const hasPermission = useCallback((permission: keyof EventPermissions): boolean => {
    if (isSystemAdmin) return true;
    if (!membership) return false;

    // Check override first
    if (membership.permissionsOverride?.[permission] !== undefined) {
      return membership.permissionsOverride[permission];
    }

    // Apply role defaults
    if (membership.role === 'ADMIN') return true;
    if (membership.role === 'USER') {
      // Users get VIEW permissions by default
      return permission.endsWith('_VIEW');
    }

    return false;
  }, [membership, isSystemAdmin]);

  const isTileVisible = useCallback((tileName: keyof TileVisibility): boolean => {
    if (isSystemAdmin) return true;
    if (!membership) return false;

    // Check override first
    if (membership.visibleTiles?.[tileName] !== undefined) {
      return membership.visibleTiles[tileName];
    }

    // Default: all tiles visible
    return true;
  }, [membership, isSystemAdmin]);

  return {
    loading,
    membership,
    isSystemAdmin,
    hasPermission,
    isTileVisible,
    isMember: membership !== null || isSystemAdmin,
  };
}
