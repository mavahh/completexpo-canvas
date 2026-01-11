import { useState } from 'react';
import { useDemoRequests } from '@/hooks/useMultiTenant';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Building2, Mail, Phone, User, Send } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function DemoRequests() {
  const { toast } = useToast();
  const { isSuperAdmin, loading: authLoading } = useMultiTenant();
  const { loading, requests, rejectRequest, refetch } = useDemoRequests();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (request: any) => {
    setProcessingId(request.id);
    
    try {
      // Get current user for processed_by
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create invite token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invite record
      const { error: inviteError } = await supabase
        .from('invites')
        .insert({
          type: 'DEMO_APPROVAL',
          token,
          email: request.email,
          expires_at: expiresAt.toISOString(),
          payload: {
            company_name: request.company_name,
            contact_name: request.contact_name,
            demo_request_id: request.id,
          },
        });

      if (inviteError) throw inviteError;

      // Update demo request status
      const { error: updateError } = await supabase
        .from('demo_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Generate invite link
      const inviteLink = `${window.location.origin}/invite/${token}`;

      // Try to send email via edge function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        'send-demo-approval-email',
        {
          body: {
            to_email: request.email,
            contact_name: request.contact_name,
            company_name: request.company_name,
            invite_link: inviteLink,
          },
        }
      );

      // Also store in email_outbox for records
      await supabase.from('email_outbox').insert({
        to_email: request.email,
        subject: 'Je Completexpo account is goedgekeurd!',
        body_text: `Beste ${request.contact_name},\n\nJe demo aanvraag voor "${request.company_name}" is goedgekeurd!\n\nActiveer je account via: ${inviteLink}\n\nDeze link is 7 dagen geldig.\n\nMet vriendelijke groet,\nHet Completexpo Team`,
        meta: { 
          invite_link: inviteLink, 
          email_sent: !emailError && emailResult?.success,
          demo_request_id: request.id,
        },
      });

      // Show appropriate message
      if (emailError || !emailResult?.success) {
        const errorMsg = emailResult?.message || 'Email kon niet verzonden worden.';
        toast({
          title: 'Goedgekeurd (zonder email)',
          description: errorMsg,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Goedgekeurd & email verzonden',
          description: `Activatie email is verstuurd naar ${request.email}`,
        });
      }

      refetch();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    const result = await rejectRequest(requestId);
    setProcessingId(null);
    
    if (result.success) {
      toast({
        title: 'Afgewezen',
        description: 'De aanvraag is afgewezen.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: result.error,
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

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Demo aanvragen</h1>
        <p className="text-muted-foreground">Beheer inkomende demo aanvragen</p>
      </div>

      {/* Pending requests */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          In afwachting ({pendingRequests.length})
        </h2>

        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Geen openstaande aanvragen
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {request.company_name}
                      </CardTitle>
                      <CardDescription>
                        Aangevraagd op {format(new Date(request.created_at), 'd MMMM yyyy HH:mm', { locale: nl })}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                      In afwachting
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{request.contact_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{request.email}</span>
                    </div>
                    {request.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{request.phone}</span>
                      </div>
                    )}
                  </div>

                  {request.reason && (
                    <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">Reden:</p>
                      <p>{request.reason}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                      className="gap-2"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <Send className="w-4 h-4" />
                        </>
                      )}
                      Goedkeuren & email versturen
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Afwijzen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Processed requests */}
      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Verwerkt ({processedRequests.length})</h2>
          <div className="space-y-2">
            {processedRequests.map((request) => (
              <Card key={request.id} className="opacity-70">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{request.company_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{request.contact_name}</span>
                    </div>
                    <Badge
                      variant={request.status === 'approved' ? 'default' : 'destructive'}
                      className={request.status === 'approved' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        : ''
                      }
                    >
                      {request.status === 'approved' ? 'Goedgekeurd' : 'Afgewezen'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
