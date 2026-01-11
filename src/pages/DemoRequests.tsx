import { useDemoRequests } from '@/hooks/useMultiTenant';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Building2, Mail, Phone, User } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function DemoRequests() {
  const { toast } = useToast();
  const { isSuperAdmin, loading: authLoading } = useMultiTenant();
  const { loading, requests, approveRequest, rejectRequest } = useDemoRequests();

  const handleApprove = async (request: any) => {
    const result = await approveRequest(request.id, request.company_name, request.user_id);
    if (result.success) {
      toast({
        title: 'Goedgekeurd',
        description: `Account "${request.company_name}" is aangemaakt.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: result.error,
      });
    }
  };

  const handleReject = async (requestId: string) => {
    const result = await rejectRequest(requestId);
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
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Goedkeuren
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(request.id)}
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
