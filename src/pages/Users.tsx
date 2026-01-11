import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Shield, User, Wrench, Search } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MANAGER' | 'BUILDER' | null;
}

const ROLE_LABELS = {
  ADMIN: { label: 'Administrator', icon: Shield, color: 'destructive' },
  MANAGER: { label: 'Beheerder', icon: User, color: 'default' },
  BUILDER: { label: 'Standbouwer', icon: Wrench, color: 'secondary' },
} as const;

export default function Users() {
  const { toast } = useToast();
  const { hasPermission, loading: permLoading } = usePermissions();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const canManageUsers = hasPermission('USERS_MANAGE');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .order('email');

      if (profileError) throw profileError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: userRole?.role as UserWithRole['role'] || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role || 'none');
    setDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      if (selectedRole === 'none') {
        // Remove role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id);
      } else {
        // Delete existing then insert new
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id);
        
        await supabase
          .from('user_roles')
          .insert([{
            user_id: editingUser.id,
            role: selectedRole as 'ADMIN' | 'MANAGER' | 'BUILDER',
          }]);
      }

      toast({ title: 'Opgeslagen', description: 'Rol is bijgewerkt' });
      setDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          Je hebt geen rechten om gebruikers te beheren.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gebruikers</h1>
          <p className="text-muted-foreground">Beheer gebruikers en hun rollen</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoeken op naam of email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="w-24">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const roleInfo = user.role ? ROLE_LABELS[user.role] : null;
              const RoleIcon = roleInfo?.icon;

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {roleInfo ? (
                      <Badge variant={roleInfo.color as any} className="gap-1">
                        {RoleIcon && <RoleIcon className="w-3 h-3" />}
                        {roleInfo.label}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Geen rol</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link to={`/users/${user.id}`}>
                      <Button variant="ghost" size="sm">
                        Beheren
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Geen gebruikers gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rol bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Gebruiker</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {editingUser?.name || editingUser?.email}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Systeem rol</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen rol</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="MANAGER">Beheerder</SelectItem>
                  <SelectItem value="BUILDER">Standbouwer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole === 'ADMIN' && 'Volledige toegang tot alle functies'}
                {selectedRole === 'MANAGER' && 'Kan evenementen, exposanten en instellingen beheren'}
                {selectedRole === 'BUILDER' && 'Kan plattegronden en exposanten bekijken (alleen lezen)'}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSaveRole} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
