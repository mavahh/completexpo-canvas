import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Building2, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Account {
  id: string;
  name: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  user_count?: number;
  event_count?: number;
}

const STATUS_BADGES: Record<string, { label: string; variant: string }> = {
  pending: { label: 'In afwachting', variant: 'secondary' },
  approved: { label: 'Actief', variant: 'default' },
  rejected: { label: 'Afgewezen', variant: 'destructive' },
  suspended: { label: 'Opgeschort', variant: 'outline' },
};

export default function Accounts() {
  const { isSuperAdmin, loading: authLoading } = useMultiTenant();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsData) {
        // Get counts for each account
        const accountsWithCounts = await Promise.all(
          accountsData.map(async (account) => {
            const [usersRes, eventsRes] = await Promise.all([
              supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('account_id', account.id),
              supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('account_id', account.id),
            ]);

            return {
              ...account,
              user_count: usersRes.count || 0,
              event_count: eventsRes.count || 0,
            };
          })
        );

        setAccounts(accountsWithCounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
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

  const filteredAccounts = accounts.filter((account) =>
    account.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground">Beheer alle organisaties op het platform</p>
        </div>
        <Link to="/admin/demo-requests">
          <Button variant="outline">Demo aanvragen</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{accounts.filter(a => a.status === 'approved').length}</p>
                <p className="text-xs text-muted-foreground">Actieve accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {accounts.reduce((sum, a) => sum + (a.user_count || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Totaal gebruikers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {accounts.reduce((sum, a) => sum + (a.event_count || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Totaal evenementen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Zoek accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gebruikers</TableHead>
              <TableHead>Evenementen</TableHead>
              <TableHead>Aangemaakt</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.map((account) => {
              const statusInfo = STATUS_BADGES[account.status] || STATUS_BADGES.pending;

              return (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {account.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant as any}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{account.user_count}</TableCell>
                  <TableCell>{account.event_count}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(account.created_at), 'd MMM yyyy', { locale: nl })}
                  </TableCell>
                  <TableCell>
                    <Link to={`/admin/accounts/${account.id}`}>
                      <Button variant="ghost" size="sm">
                        Bekijken
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredAccounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Geen accounts gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
