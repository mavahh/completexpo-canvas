import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Search, Copy, Check, ExternalLink, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface EmailRecord {
  id: string;
  to_email: string;
  subject: string;
  body_text: string;
  meta: any;
  created_at: string;
  sent_at: string | null;
}

export default function AdminEmailOutbox() {
  const { isSuperAdmin, loading: authLoading } = useMultiTenant();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchEmails();
    }
  }, [isSuperAdmin]);

  const fetchEmails = async () => {
    try {
      const { data } = await supabase
        .from('email_outbox')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (email: EmailRecord) => {
    const link = email.meta?.inviteLink;
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopiedId(email.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Link gekopieerd' });
    }
  };

  const markAsSent = async (emailId: string) => {
    try {
      await supabase
        .from('email_outbox')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', emailId);

      toast({ title: 'Gemarkeerd als verzonden' });
      fetchEmails();
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

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Je hebt geen toegang tot deze pagina.</p>
      </div>
    );
  }

  const filteredEmails = emails.filter(
    (e) =>
      e.to_email.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase())
  );

  const pendingEmails = filteredEmails.filter((e) => !e.sent_at);
  const sentEmails = filteredEmails.filter((e) => e.sent_at);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Outbox</h1>
          <p className="text-muted-foreground">
            Bekijk en beheer uitgaande emails (simulatie mode)
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op email of onderwerp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pending Emails */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          In wachtrij ({pendingEmails.length})
        </h2>

        {pendingEmails.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Geen emails in wachtrij
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingEmails.map((email) => (
              <Card key={email.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{email.to_email}</p>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                            In wachtrij
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground truncate">{email.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(email.created_at), 'd MMM yyyy HH:mm', { locale: nl })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {email.meta?.inviteLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(email)}
                          className="gap-1"
                        >
                          {copiedId === email.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          Link
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEmail(email)}
                      >
                        Bekijken
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsSent(email.id)}
                      >
                        Als verzonden markeren
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sent Emails */}
      {sentEmails.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Verzonden ({sentEmails.length})</h2>
          <div className="space-y-2">
            {sentEmails.slice(0, 20).map((email) => (
              <Card key={email.id} className="opacity-70">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{email.to_email}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground truncate">{email.subject}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                        Verzonden
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEmail(email)}
                      >
                        Bekijken
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email details</DialogTitle>
            <DialogDescription>
              {selectedEmail?.sent_at ? 'Verzonden' : 'In wachtrij'}
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Aan</p>
                  <p className="font-medium">{selectedEmail.to_email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Datum</p>
                  <p className="font-medium">
                    {format(new Date(selectedEmail.created_at), 'd MMMM yyyy HH:mm', { locale: nl })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Onderwerp</p>
                <p className="font-medium">{selectedEmail.subject}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Inhoud</p>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {selectedEmail.body_text}
                  </pre>
                </div>
              </div>

              {selectedEmail.meta?.inviteLink && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Invite link</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={selectedEmail.meta.inviteLink}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyLink(selectedEmail)}
                    >
                      {copiedId === selectedEmail.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedEmail.meta.inviteLink, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
