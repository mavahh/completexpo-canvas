import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/lib/auth';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus, Trash2, Shield, User } from 'lucide-react';

interface EventMember {
  id: string;
  user_id: string;
  role: 'ADMIN' | 'USER';
  email: string;
  name: string | null;
}

export default function EventUsers() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();

  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'USER'>('USER');
  const [saving, setSaving] = useState(false);

  const canManageUsers = hasPermission('USERS_MANAGE');

  useEffect(() => {
    if (eventId) fetchMembers();
  }, [eventId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('event_members')
        .select(`
          id,
          user_id,
          role,
          profiles!event_members_user_id_fkey(email, name)
        `)
        .eq('event_id', eventId);

      if (error) throw error;

      const membersWithProfiles: EventMember[] = (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        email: m.profiles?.email || 'Onbekend',
        name: m.profiles?.name,
      }));

      setMembers(membersWithProfiles);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newEmail.trim() || !eventId) return;
    setSaving(true);

    try {
      // Find user by email
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newEmail.trim().toLowerCase())
        .single();

      if (findError || !profile) {
        throw new Error('Gebruiker niet gevonden. Zorg dat ze eerst een account hebben.');
      }

      // Check if already member
      const existing = members.find((m) => m.user_id === profile.id);
      if (existing) {
        throw new Error('Deze gebruiker is al lid van dit evenement.');
      }

      // Add member
      const { error: insertError } = await supabase
        .from('event_members')
        .insert({
          event_id: eventId,
          user_id: profile.id,
          role: newRole,
        });

      if (insertError) throw insertError;

      toast({ title: 'Toegevoegd', description: 'Lid is toegevoegd aan dit evenement' });
      setDialogOpen(false);
      setNewEmail('');
      setNewRole('USER');
      fetchMembers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member: EventMember) => {
    if (member.user_id === user?.id) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Je kunt jezelf niet verwijderen' });
      return;
    }

    try {
      await supabase.from('event_members').delete().eq('id', member.id);
      toast({ title: 'Verwijderd', description: 'Lid is verwijderd' });
      fetchMembers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    }
  };

  const handleRoleChange = async (member: EventMember, newRole: 'ADMIN' | 'USER') => {
    try {
      await supabase
        .from('event_members')
        .update({ role: newRole })
        .eq('id', member.id);

      toast({ title: 'Bijgewerkt', description: 'Rol is aangepast' });
      fetchMembers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    }
  };

  if (loading || permLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${eventId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Terug
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Evenement toegang</h1>
            <p className="text-muted-foreground">Beheer wie toegang heeft tot dit evenement</p>
          </div>
        </div>
        {canManageUsers && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Lid toevoegen
          </Button>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              {canManageUsers && <TableHead className="w-24">Acties</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.name || <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  {canManageUsers && member.user_id !== user?.id ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member, v as 'ADMIN' | 'USER')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="USER">Gebruiker</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {member.role === 'ADMIN' ? (
                        <><Shield className="w-3 h-3 mr-1" /> Admin</>
                      ) : (
                        <><User className="w-3 h-3 mr-1" /> Gebruiker</>
                      )}
                    </Badge>
                  )}
                </TableCell>
                {canManageUsers && (
                  <TableCell>
                    {member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lid toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@voorbeeld.nl"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'ADMIN' | 'USER')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin (volledig beheer)</SelectItem>
                  <SelectItem value="USER">Gebruiker (alleen lezen)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleAddMember} disabled={saving || !newEmail.trim()}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Toevoegen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
