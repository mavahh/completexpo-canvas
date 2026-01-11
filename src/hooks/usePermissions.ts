import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type SystemRole = 'ADMIN' | 'MANAGER' | 'BUILDER';

export interface UserPermissions {
  loading: boolean;
  systemRole: SystemRole | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  isSystemAdmin: boolean;
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [systemRole, setSystemRole] = useState<SystemRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setSystemRole(null);
      setPermissions([]);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Get user's system role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        const role = (roleData?.role as SystemRole) || null;
        setSystemRole(role);

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
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    if (systemRole === 'ADMIN') return true;
    return permissions.includes(permission);
  };

  return {
    loading,
    systemRole,
    permissions,
    hasPermission,
    isSystemAdmin: systemRole === 'ADMIN',
  };
}
