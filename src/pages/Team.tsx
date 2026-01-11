import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  UserPlus, 
  Users, 
  Mail, 
  Shield, 
  Crown, 
  User,
  Trash2,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface TeamMember {
  id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  created_at: string;
  profile: {
    name: string | null;
    email: string;
  } | null;
}

interface PendingInvite {
  id: string;
  email: string;
  payload: any;
  created_at: string;
  expires_at: string;
  token: string;
}

const ROLE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  OWNER: { label: 'Eigenaar', icon: Crown, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' },
  ADMIN: { label: 'Admin', icon: Shield, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
  MEMBER: { label: 'Lid', icon: User, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
};

export default function Team() {
  const { user } = useAuth();
  const { account, isAccountAdmin, loading: authLoading } = useMultiTenant();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'MEMBER' as 'OWNER' | 'ADMIN' | 'MEMBER',
  });

  useEffect(() => {
    if (account?.id) {
      fetchTeamData();
    }
  }, [account?.id]);

  const fetchTeamData = async () => {
    if (!account?.id) return;

    try {
      // Fetch account members with profiles
      const { data: membersData } = await supabase
        .from('account_members')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('account_id', account.id)
        .order('created_at');

      if (membersData) {
        // Fetch profile data for each member
        const memberProfiles = await Promise.all(
          membersData.map(async (member) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', member.user_id)
              .single();

            return {
              ...member,
              profile,
            };
          })
        );
        setMembers(memberProfiles as TeamMember[]);
      }

      // Fetch pending invites
      const { data: invitesData } = await supabase
        .from('invites')
        .select('id, email, payload, created_at, expires_at, token')
        .eq('account_id', account.id)
        .eq('type', 'ACCOUNT_INVITE')
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      setPendingInvites(invitesData || []);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.id || !user?.id) return;

    setSaving(true);

    try {
      // Create invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .insert({
          type: 'ACCOUNT_INVITE',
          email: inviteForm.email,
          account_id: account.id,
          invited_by_user_id: user.id,
          payload: { accountRole: inviteForm.role },
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Create email outbox entry
      const inviteLink = `${window.location.origin}/invite/${invite.token}`;
      await supabase.from('email_outbox').insert({
        to_email: inviteForm.email,
        subject: `Uitnodiging voor ${account.name}`,
        body_text: `Je bent uitgenodigd om lid te worden van ${account.name} op Completexpo.\n\nKlik op onderstaande link om je account te activeren:\n${inviteLink}\n\nDeze link is 7 dagen geldig.`,
        meta: { inviteLink, inviteId: invite.id, accountId: account.id },
      });

      toast({
        title: 'Uitnodiging verstuurd',
        description: `Een uitnodiging is naar ${inviteForm.email} gestuurd`,
      });

      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: 'MEMBER' });
      fetchTeamData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteId) return;

    try {
      await supabase.from('account_members').delete().eq('id', deleteId);
      toast({ title: 'Lid verwijderd' });
      fetchTeamData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    }
    setDeleteId(null);
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: 'Link gekopieerd' });
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      await supabase.from('invites').delete().eq('id', inviteId);
      toast({ title: 'Uitnodiging geannuleerd' });
      fetchTeamData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Geen organisatie gevonden</p>
      </div>
    );
  }

  const currentUserMember = members.find(m => m.user_id === user?.id);
  const canManageTeam = isAccountAdmin || currentUserMember?.role === 'OWNER';

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground">Beheer teamleden van {account.name}</p>
        </div>
        {canManageTeam && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Uitnodigen
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">Teamleden</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvites.length}</p>
                <p className="text-xs text-muted-foreground">Openstaande uitnodigingen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER').length}
                </p>
                <p className="text-xs text-muted-foreground">Beheerders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Teamleden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const roleInfo = ROLE_LABELS[member.role];
            const RoleIcon = roleInfo.icon;
            const isCurrentUser = member.user_id === user?.id;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.profile?.name || member.profile?.email}
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground ml-2">(jij)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={roleInfo.color}>
                    <RoleIcon className="w-3 h-3 mr-1" />
                    {roleInfo.label}
                  </Badge>
                  {canManageTeam && !isCurrentUser && member.role !== 'OWNER' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(member.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Openstaande uitnodigingen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Uitgenodigd op {format(new Date(invite.created_at), 'd MMM yyyy', { locale: nl })}
                      {' • '}
                      Verloopt {format(new Date(invite.expires_at), 'd MMM yyyy', { locale: nl })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {ROLE_LABELS[invite.payload?.accountRole || 'MEMBER']?.label}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(invite.token)}
                  >
                    {copiedToken === invite.token ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  {canManageTeam && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelInvite(invite.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teamlid uitnodigen</DialogTitle>
            <DialogDescription>
              Nodig een nieuw teamlid uit voor {account.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="collega@bedrijf.nl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value: 'OWNER' | 'ADMIN' | 'MEMBER') => 
                  setInviteForm({ ...inviteForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Lid - Basis toegang</SelectItem>
                  <SelectItem value="ADMIN">Admin - Kan team beheren</SelectItem>
                  {currentUserMember?.role === 'OWNER' && (
                    <SelectItem value="OWNER">Eigenaar - Volledige toegang</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Uitnodiging versturen
              </Button>
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Annuleren
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teamlid verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit teamlid verliest toegang tot de organisatie en alle evenementen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
