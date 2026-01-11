import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, User, Wrench, Save } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface RolePermission {
  role: string;
  permission_id: string;
}

const ROLES = [
  { key: 'ADMIN', label: 'Administrator', icon: Shield, description: 'Volledige toegang (alle rechten)' },
  { key: 'MANAGER', label: 'Beheerder', icon: User, description: 'Beheer van evenementen en exposanten' },
  { key: 'BUILDER', label: 'Standbouwer', icon: Wrench, description: 'Alleen lezen toegang' },
] as const;

export default function Roles() {
  const { toast } = useToast();
  const { hasPermission, loading: permLoading, isSystemAdmin } = usePermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: perms }, { data: rolePerms }] = await Promise.all([
        supabase.from('permissions').select('*').order('name'),
        supabase.from('role_permissions').select('*'),
      ]);

      setPermissions(perms || []);
      setRolePermissions(rolePerms || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const hasRolePermission = (role: string, permissionId: string) => {
    return rolePermissions.some(
      (rp) => rp.role === role && rp.permission_id === permissionId
    );
  };

  const togglePermission = (role: string, permissionId: string) => {
    const exists = hasRolePermission(role, permissionId);
    
    if (exists) {
      setRolePermissions((prev) =>
        prev.filter((rp) => !(rp.role === role && rp.permission_id === permissionId))
      );
    } else {
      setRolePermissions((prev) => [...prev, { role, permission_id: permissionId }]);
    }
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing role permissions for MANAGER and BUILDER
      await supabase
        .from('role_permissions')
        .delete()
        .in('role', ['MANAGER', 'BUILDER']);

      // Insert new ones
      const toInsert = rolePermissions
        .filter((rp) => rp.role !== 'ADMIN')
        .map((rp) => ({
          role: rp.role as 'ADMIN' | 'MANAGER' | 'BUILDER',
          permission_id: rp.permission_id,
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(toInsert);
        if (error) throw error;
      }

      toast({ title: 'Opgeslagen', description: 'Rolrechten zijn bijgewerkt' });
      setDirty(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSystemAdmin) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          Alleen administrators kunnen rollen beheren.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rollen & Rechten</h1>
          <p className="text-muted-foreground">Configureer rechten per rol</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Opslaan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ROLES.map((role) => {
          const RoleIcon = role.icon;
          const isAdmin = role.key === 'ADMIN';

          return (
            <Card key={role.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RoleIcon className="w-5 h-5" />
                  {role.label}
                </CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {permissions.map((perm) => {
                    const checked = isAdmin || hasRolePermission(role.key, perm.id);

                    return (
                      <div
                        key={perm.id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={`${role.key}-${perm.id}`}
                          checked={checked}
                          disabled={isAdmin}
                          onCheckedChange={() => togglePermission(role.key, perm.id)}
                        />
                        <label
                          htmlFor={`${role.key}-${perm.id}`}
                          className={`text-sm cursor-pointer ${
                            isAdmin ? 'text-muted-foreground' : ''
                          }`}
                        >
                          {perm.description || perm.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechten overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Recht</th>
                  {ROLES.map((role) => (
                    <th key={role.key} className="text-center py-2 px-4">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.id} className="border-b">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{perm.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {perm.description}
                      </div>
                    </td>
                    {ROLES.map((role) => (
                      <td key={role.key} className="text-center py-2 px-4">
                        {role.key === 'ADMIN' || hasRolePermission(role.key, perm.id) ? (
                          <Badge variant="default" className="text-xs">✓</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">—</Badge>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
