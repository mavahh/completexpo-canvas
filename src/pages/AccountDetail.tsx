import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Mail,
  User,
  Shield,
  Trash2,
  Save,
  MoreHorizontal,
  KeyRound,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Account {
  id: string;
  name: string;
  status: string;
  created_at: string;
  approved_at: string | null;
}

interface Profile {
  id: string;
  name: string | null;
  email: string;
  is_account_admin: boolean;
  created_at: string;
}

interface Event {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
}

interface DemoRequest {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'In afwachting' },
  { value: 'approved', label: 'Actief' },
  { value: 'suspended', label: 'Opgeschort' },
];

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, loading: authLoading } = useMultiTenant();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [demoRequest, setDemoRequest] = useState<DemoRequest | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    status: 'approved',
  });

  useEffect(() => {
    if (accountId) {
      fetchData();
    }
  }, [accountId]);

  const fetchData = async () => {
    try {
      // Fetch account
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountError) throw accountError;
      setAccount(accountData);
      setFormData({
        name: accountData.name,
        status: accountData.status,
      });

      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, email, is_account_admin, created_at')
        .eq('account_id', accountId)
        .order('created_at');

      setUsers(usersData || []);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name, start_date, end_date, location')
        .eq('account_id', accountId)
        .order('start_date', { ascending: false });

      setEvents(eventsData || []);

      // Fetch original demo request
      const { data: demoData } = await supabase
        .from('demo_requests')
        .select('id, company_name, contact_name, email, phone, created_at')
        .eq('created_account_id', accountId)
        .single();

      setDemoRequest(demoData as DemoRequest | null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout bij laden',
        description: error.message,
      });
      navigate('/admin/accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accountId) return;

    setSaving(true);
    try {
      const updates: any = {
        name: formData.name,
        status: formData.status,
      };

      // If approving, set approved_at
      if (formData.status === 'approved' && account?.status !== 'approved') {
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: 'Opgeslagen',
        description: 'Account bijgewerkt.',
      });

      fetchData();
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

  const handleDelete = async () => {
    if (!accountId) return;

    try {
      // First unlink all users
      await supabase
        .from('profiles')
        .update({ account_id: null, is_account_admin: false })
        .eq('account_id', accountId);

      // Delete the account
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: 'Verwijderd',
        description: 'Account is verwijderd.',
      });

      navigate('/admin/accounts');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      toast({
        title: 'Link verstuurd',
        description: `Wachtwoord reset link verstuurd naar ${email}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    }
  };

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_account_admin: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Bijgewerkt',
        description: currentStatus ? 'Adminrechten verwijderd.' : 'Adminrechten toegekend.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Je hebt geen toegang tot deze pagina.</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Account niet gevonden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/accounts')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            {account.name}
          </h1>
          <p className="text-muted-foreground">
            Aangemaakt op {format(new Date(account.created_at), 'd MMMM yyyy', { locale: nl })}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle>Account gegevens</CardTitle>
            <CardDescription>Beheer de basisgegevens van dit account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Opslaan
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Verwijderen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Reset */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Wachtwoord beheer
            </CardTitle>
            <CardDescription>Stuur een wachtwoord reset link naar een gebruiker</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Original demo request info */}
            {demoRequest && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <p className="text-sm font-medium">Originele aanvrager:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {demoRequest.contact_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {demoRequest.email}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => sendPasswordReset(demoRequest.email)}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Reset link sturen naar {demoRequest.email}
                </Button>
              </div>
            )}

            {/* Manual email input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="resetEmail" className="sr-only">E-mailadres</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="E-mailadres invoeren..."
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={async () => {
                  if (!resetEmail) return;
                  setSendingReset(true);
                  await sendPasswordReset(resetEmail);
                  setSendingReset(false);
                  setResetEmail('');
                }}
                disabled={!resetEmail || sendingReset}
                className="gap-2"
              >
                {sendingReset ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Versturen
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              De gebruiker ontvangt een e-mail met een link om een nieuw wachtwoord in te stellen.
            </p>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gebruikers ({users.length})
            </CardTitle>
            <CardDescription>Gebruikers gekoppeld aan dit account</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Geen gebruikers gekoppeld aan dit account.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Sinds</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {user.name || 'Onbekend'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.is_account_admin ? (
                          <Badge className="gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Gebruiker</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'd MMM yyyy', { locale: nl })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => toggleAdmin(user.id, user.is_account_admin)}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {user.is_account_admin ? 'Degraderen naar gebruiker' : 'Promoveren tot admin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => sendPasswordReset(user.email)}
                            >
                              <KeyRound className="w-4 h-4 mr-2" />
                              Wachtwoord reset sturen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Evenementen ({events.length})
            </CardTitle>
            <CardDescription>Evenementen van dit account</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nog geen evenementen aangemaakt.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.location || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.start_date
                          ? format(new Date(event.start_date), 'd MMM yyyy', { locale: nl })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Link to={`/events/${event.id}`}>
                          <Button variant="ghost" size="sm">
                            Bekijken
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{account.name}" wilt verwijderen? Gebruikers worden
              losgekoppeld maar niet verwijderd. Evenementen en gerelateerde data worden
              ook verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
