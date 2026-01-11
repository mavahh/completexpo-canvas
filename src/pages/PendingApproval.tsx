import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DemoRequest {
  id: string;
  company_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at: string | null;
}

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState<DemoRequest | null>(null);

  const fetchRequest = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('demo_requests')
        .select('id, company_name, status, created_at, processed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setRequest(data as DemoRequest | null);
    } catch (error) {
      console.error('Error fetching request:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [user]);

  // If approved, check if profile has account and redirect
  useEffect(() => {
    if (request?.status === 'approved' && user) {
      const checkAccount = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('id', user.id)
          .single();

        if (profile?.account_id) {
          navigate('/dashboard');
        }
      };
      checkAccount();
    }
  }, [request?.status, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequest();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No request found - maybe they haven't submitted one yet
  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Geen aanvraag gevonden</CardTitle>
            <CardDescription className="mt-2">
              Je hebt nog geen demo-aanvraag ingediend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/demo-request')} className="w-full">
              Demo aanvragen
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="w-full gap-2">
              <LogOut className="w-4 h-4" />
              Uitloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Request was rejected
  if (request.status === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Aanvraag afgewezen</CardTitle>
            <CardDescription className="mt-2">
              Helaas is je aanvraag voor "{request.company_name}" afgewezen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Als je denkt dat dit een vergissing is, neem dan contact met ons op.
            </p>
            <Button onClick={() => navigate('/demo-request')} variant="outline" className="w-full">
              Nieuwe aanvraag indienen
            </Button>
            <Button onClick={handleSignOut} variant="ghost" className="w-full gap-2">
              <LogOut className="w-4 h-4" />
              Uitloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Request is approved - they should be redirected but show success anyway
  if (request.status === 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Aanvraag goedgekeurd!</CardTitle>
            <CardDescription className="mt-2">
              Je account voor "{request.company_name}" is actief.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Naar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Request is pending
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle>Aanvraag in behandeling</CardTitle>
          <CardDescription className="mt-2">
            Je demo-aanvraag voor "{request.company_name}" wordt momenteel bekeken.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                In afwachting
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Aangevraagd op</span>
              <span className="text-sm font-medium">
                {format(new Date(request.created_at), 'd MMM yyyy, HH:mm', { locale: nl })}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Dit duurt meestal minder dan 24 uur. We sturen je een e-mail zodra je aanvraag is verwerkt.
          </p>

          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="flex-1 gap-2"
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Vernieuwen
            </Button>
            <Button onClick={handleSignOut} variant="ghost" className="flex-1 gap-2">
              <LogOut className="w-4 h-4" />
              Uitloggen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
