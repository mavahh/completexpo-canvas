import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type SystemRole = 'ADMIN' | 'MANAGER' | 'BUILDER';
export type EventRole = 'ADMIN' | 'USER';

export interface GlobalModuleVisibility {
  DASHBOARD: boolean;
  EVENTS: boolean;
  USERS: boolean;
  SETTINGS: boolean;
  CRM: boolean;
}

export interface EventPermissions {
  EVENTS_VIEW: boolean;
  EVENTS_MANAGE: boolean;
  FLOORPLAN_VIEW: boolean;
  FLOORPLAN_EDIT: boolean;
  EXHIBITORS_VIEW: boolean;
  EXHIBITORS_MANAGE: boolean;
  REQUESTS_VIEW: boolean;
  REQUESTS_MANAGE: boolean;
  SETTINGS_VIEW: boolean;
  SETTINGS_MANAGE: boolean;
  USERS_VIEW: boolean;
  USERS_MANAGE: boolean;
  EXPORT_VIEW: boolean;
  EXPORT_USE: boolean;
}

export interface TileVisibility {
  handbook: boolean;
  floorplan: boolean;
  orders: boolean;
  exhibitors: boolean;
  requests: boolean;
  messages: boolean;
  partnerships: boolean;
  settings: boolean;
  users: boolean;
  credits: boolean;
}

// Default permissions per system role
export const DEFAULT_PERMISSIONS: Record<SystemRole, Partial<EventPermissions>> = {
  ADMIN: {
    EVENTS_VIEW: true,
    EVENTS_MANAGE: true,
    FLOORPLAN_VIEW: true,
    FLOORPLAN_EDIT: true,
    EXHIBITORS_VIEW: true,
    EXHIBITORS_MANAGE: true,
    REQUESTS_VIEW: true,
    REQUESTS_MANAGE: true,
    SETTINGS_VIEW: true,
    SETTINGS_MANAGE: true,
    USERS_VIEW: true,
    USERS_MANAGE: true,
    EXPORT_VIEW: true,
    EXPORT_USE: true,
  },
  MANAGER: {
    EVENTS_VIEW: true,
    EVENTS_MANAGE: true,
    FLOORPLAN_VIEW: true,
    FLOORPLAN_EDIT: true,
    EXHIBITORS_VIEW: true,
    EXHIBITORS_MANAGE: true,
    REQUESTS_VIEW: true,
    REQUESTS_MANAGE: true,
    SETTINGS_VIEW: true,
    SETTINGS_MANAGE: true,
    USERS_VIEW: true,
    USERS_MANAGE: false,
    EXPORT_VIEW: true,
    EXPORT_USE: true,
  },
  BUILDER: {
    EVENTS_VIEW: true,
    EVENTS_MANAGE: false,
    FLOORPLAN_VIEW: true,
    FLOORPLAN_EDIT: false,
    EXHIBITORS_VIEW: true,
    EXHIBITORS_MANAGE: false,
    REQUESTS_VIEW: false,
    REQUESTS_MANAGE: false,
    SETTINGS_VIEW: false,
    SETTINGS_MANAGE: false,
    USERS_VIEW: false,
    USERS_MANAGE: false,
    EXPORT_VIEW: false,
    EXPORT_USE: false,
  },
};

// Default module visibility per role
export const DEFAULT_MODULE_VISIBILITY: Record<SystemRole, GlobalModuleVisibility> = {
  ADMIN: {
    DASHBOARD: true,
    EVENTS: true,
    USERS: true,
    SETTINGS: true,
    CRM: true,
  },
  MANAGER: {
    DASHBOARD: true,
    EVENTS: true,
    USERS: false,
    SETTINGS: true,
    CRM: true,
  },
  BUILDER: {
    DASHBOARD: true,
    EVENTS: true,
    USERS: false,
    SETTINGS: false,
    CRM: false,
  },
};

// Default tiles (all visible by default for event members)
export const DEFAULT_TILES: TileVisibility = {
  handbook: true,
  floorplan: true,
  orders: true,
  exhibitors: true,
  requests: true,
  messages: true,
  partnerships: true,
  settings: true,
  users: true,
  credits: true,
};

export interface UserPermissions {
  loading: boolean;
  systemRole: SystemRole | null;
  permissions: string[];
  globalModuleVisibility: GlobalModuleVisibility;
  hasPermission: (permission: string) => boolean;
  hasEventPermission: (eventId: string, permission: string) => Promise<boolean>;
  isTileVisible: (eventId: string, tileName: string) => Promise<boolean>;
  isModuleVisible: (moduleName: keyof GlobalModuleVisibility) => boolean;
  isSystemAdmin: boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [systemRole, setSystemRole] = useState<SystemRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [globalModuleVisibility, setGlobalModuleVisibility] = useState<GlobalModuleVisibility>({
    DASHBOARD: true,
    EVENTS: true,
    USERS: false,
    SETTINGS: false,
    CRM: false,
  });

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

// Hook for event-specific permissions
export function useEventPermissions(eventId: string | undefined) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<{
    role: EventRole;
    permissionsOverride: Partial<EventPermissions> | null;
    visibleTiles: Partial<TileVisibility> | null;
  } | null>(null);
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
