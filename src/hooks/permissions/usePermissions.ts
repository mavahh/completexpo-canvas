// Main permissions hook for system-level permissions

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { 
  SystemRole, 
  GlobalModuleVisibility, 
  UserPermissions 
} from './types';
import { 
  DEFAULT_MODULE_VISIBILITY, 
  DEFAULT_GLOBAL_MODULE_VISIBILITY 
} from './constants';

export function usePermissions(): UserPermissions {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [systemRole, setSystemRole] = useState<SystemRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [globalModuleVisibility, setGlobalModuleVisibility] = useState<GlobalModuleVisibility>(
    DEFAULT_GLOBAL_MODULE_VISIBILITY
  );

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setSystemRole(null);
      setPermissions([]);
      return;
    }

    try {
      // Get user's system role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const role = (roleData?.role as SystemRole) || null;
      setSystemRole(role);

      // Get global module visibility from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('global_module_visibility')
        .eq('id', user.id)
        .single();

      if (profileData?.global_module_visibility) {
        setGlobalModuleVisibility(profileData.global_module_visibility as unknown as GlobalModuleVisibility);
      } else if (role) {
        // Use role defaults if no custom settings
        setGlobalModuleVisibility(DEFAULT_MODULE_VISIBILITY[role]);
      }

      // If admin, they have all permissions
      if (role === 'ADMIN') {
        const { data: allPerms } = await supabase
          .from('permissions')
          .select('name');
        setPermissions(allPerms?.map(p => p.name) || []);
      } else if (role) {
        // Get role-based permissions
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission_id, permissions(name)')
          .eq('role', role);

        const permNames = rolePerms?.map(rp => 
          (rp.permissions as any)?.name
        ).filter(Boolean) || [];
        setPermissions(permNames);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (systemRole === 'ADMIN') return true;
    return permissions.includes(permission);
  }, [systemRole, permissions]);

  const hasEventPermission = useCallback(async (eventId: string, permission: string): Promise<boolean> => {
    if (!user) return false;
    if (systemRole === 'ADMIN') return true;

    // Check via database function
    const { data } = await supabase.rpc('has_event_permission', {
      _user_id: user.id,
      _event_id: eventId,
      _permission_name: permission,
    });

    return data === true;
  }, [user, systemRole]);

  const isTileVisible = useCallback(async (eventId: string, tileName: string): Promise<boolean> => {
    if (!user) return false;
    if (systemRole === 'ADMIN') return true;

    // Check via database function
    const { data } = await supabase.rpc('is_tile_visible', {
      _user_id: user.id,
      _event_id: eventId,
      _tile_name: tileName,
    });

    return data === true;
  }, [user, systemRole]);

  const isModuleVisible = useCallback((moduleName: keyof GlobalModuleVisibility): boolean => {
    if (systemRole === 'ADMIN') return true;
    return globalModuleVisibility[moduleName] ?? false;
  }, [systemRole, globalModuleVisibility]);

  return {
    loading,
    systemRole,
    permissions,
    globalModuleVisibility,
    hasPermission,
    hasEventPermission,
    isTileVisible,
    isModuleVisible,
    isSystemAdmin: systemRole === 'ADMIN',
    refetch: fetchPermissions,
  };
}
