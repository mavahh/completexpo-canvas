import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Users, Mail, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Stats {
  accounts: number;
  pendingRequests: number;
  users: number;
  emailsInOutbox: number;
}

interface RecentRequest {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { isSuperAdmin, loading: authLoading } = useMultiTenant();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ accounts: 0, pendingRequests: 0, users: 0, emailsInOutbox: 0 });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    try {
      const [accountsRes, requestsRes, profilesRes, emailsRes, recentRes] = await Promise.all([
        supabase.from('accounts').select('id', { count: 'exact', head: true }),
        supabase.from('demo_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('email_outbox').select('id', { count: 'exact', head: true }).is('sent_at', null),
        supabase.from('demo_requests').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        accounts: accountsRes.count || 0,
        pendingRequests: requestsRes.count || 0,
        users: profilesRes.count || 0,
        emailsInOutbox: emailsRes.count || 0,
      });

      setRecentRequests(recentRes.data || []);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
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

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overzicht en beheer</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/admin/accounts">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.accounts}</p>
                  <p className="text-sm text-muted-foreground">Organisaties</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/demo-requests">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.pendingRequests}</p>
                  <p className="text-sm text-muted-foreground">Openstaande aanvragen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/users">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.users}</p>
                  <p className="text-sm text-muted-foreground">Gebruikers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/email-outbox">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.emailsInOutbox}</p>
                  <p className="text-sm text-muted-foreground">Emails in wachtrij</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Demo Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recente aanvragen</CardTitle>
            <CardDescription>Laatste demo aanvragen</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Geen aanvragen</p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{request.company_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'd MMM yyyy', { locale: nl })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        request.status === 'approved'
                          ? 'default'
                          : request.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className={
                        request.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : ''
                      }
                    >
                      {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                      {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {request.status === 'pending' ? 'In afwachting' : 
                       request.status === 'approved' ? 'Goedgekeurd' : 'Afgewezen'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link to="/admin/demo-requests">
                <Button variant="outline" className="w-full">
                  Alle aanvragen bekijken
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Snelle acties</CardTitle>
            <CardDescription>Beheer functies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/accounts" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Building2 className="w-4 h-4" />
                Organisaties beheren
              </Button>
            </Link>
            <Link to="/admin/demo-requests" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText className="w-4 h-4" />
                Demo aanvragen verwerken
              </Button>
            </Link>
            <Link to="/admin/users" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Users className="w-4 h-4" />
                Gebruikers bekijken
              </Button>
            </Link>
            <Link to="/admin/email-outbox" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Mail className="w-4 h-4" />
                Email outbox bekijken
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
