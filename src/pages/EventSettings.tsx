import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, Trash2, FileText, Copy, Check, ExternalLink } from 'lucide-react';

interface EventDocument {
  id: string;
  language: string;
  filename: string;
  file_url: string;
  uploaded_at: string;
}

const LANGUAGES = [
  { code: 'NL', label: 'Nederlands' },
  { code: 'FR', label: 'Frans' },
  { code: 'EN', label: 'Engels' },
  { code: 'DE', label: 'Duits' },
];

export default function EventSettings() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission, loading: permLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [requestToken, setRequestToken] = useState<string | null>(null);
  const [requestsEnabled, setRequestsEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  const canManageSettings = hasPermission('SETTINGS_MANAGE');

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    try {
      // Fetch event info
      const { data: event } = await supabase
        .from('events')
        .select('public_request_token, public_requests_enabled')
        .eq('id', eventId)
        .single();

      setRequestToken(event?.public_request_token || null);
      setRequestsEnabled(event?.public_requests_enabled || false);

      // Fetch documents
      const { data: docs } = await supabase
        .from('event_documents')
        .select('*')
        .eq('event_id', eventId)
        .eq('type', 'TERMS');

      setDocuments(docs || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (language: string, file: File) => {
    if (!canManageSettings || !eventId) return;
    setUploading(language);

    try {
      const filePath = `${eventId}/terms/${language}/${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('event-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-documents')
        .getPublicUrl(filePath);

      // Delete existing then insert
      await supabase
        .from('event_documents')
        .delete()
        .eq('event_id', eventId)
        .eq('type', 'TERMS')
        .eq('language', language);

      const { error: dbError } = await supabase
        .from('event_documents')
        .insert([{
          event_id: eventId,
          type: 'TERMS' as const,
          language: language as 'NL' | 'FR' | 'EN' | 'DE',
          filename: file.name,
          file_url: publicUrl,
          uploaded_at: new Date().toISOString(),
        }]);

      if (dbError) throw dbError;

      toast({ title: 'Geüpload', description: `${LANGUAGES.find(l => l.code === language)?.label} document geüpload` });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout bij uploaden', description: error.message });
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (doc: EventDocument) => {
    if (!canManageSettings) return;

    try {
      // Delete from storage
      const pathMatch = doc.file_url.match(/event-documents\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('event-documents').remove([pathMatch[1]]);
      }

      // Delete from database
      await supabase.from('event_documents').delete().eq('id', doc.id);

      toast({ title: 'Verwijderd', description: 'Document is verwijderd' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    }
  };

  const generateRequestToken = async () => {
    if (!canManageSettings || !eventId) return;

    try {
      const token = crypto.randomUUID();
      await supabase
        .from('events')
        .update({ 
          public_request_token: token,
          public_requests_enabled: true 
        })
        .eq('id', eventId);

      setRequestToken(token);
      setRequestsEnabled(true);
      toast({ title: 'Token gegenereerd', description: 'Publieke aanvraaglink is actief' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    }
  };

  const toggleRequests = async () => {
    if (!canManageSettings || !eventId) return;

    try {
      await supabase
        .from('events')
        .update({ public_requests_enabled: !requestsEnabled })
        .eq('id', eventId);

      setRequestsEnabled(!requestsEnabled);
      toast({ title: requestsEnabled ? 'Uitgeschakeld' : 'Ingeschakeld' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/request/${requestToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Gekopieerd', description: 'Link is gekopieerd naar klembord' });
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${eventId}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Terug
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instellingen</h1>
          <p className="text-muted-foreground">Evenement instellingen en documenten</p>
        </div>
      </div>

      <Tabs defaultValue="terms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="terms">Verkoopvoorwaarden</TabsTrigger>
          <TabsTrigger value="requests">Aanvraaglink</TabsTrigger>
          <TabsTrigger value="email">E-mail</TabsTrigger>
          <TabsTrigger value="payments">Online betalen</TabsTrigger>
        </TabsList>

        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verkoopvoorwaarden</CardTitle>
              <CardDescription>
                Upload verkoopvoorwaarden per taal. Exposanten zien dit bij hun aanvraag.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LANGUAGES.map((lang) => {
                  const doc = documents.find((d) => d.language === lang.code);
                  const isUploading = uploading === lang.code;

                  return (
                    <div
                      key={lang.code}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{lang.code}</Badge>
                          <span className="font-medium">{lang.label}</span>
                        </div>
                        {doc && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc)}
                            disabled={!canManageSettings}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      {doc ? (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                          <FileText className="w-4 h-4 text-primary" />
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline truncate flex-1"
                          >
                            {doc.filename}
                          </a>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Geen document geüpload
                        </p>
                      )}

                      {canManageSettings && (
                        <div>
                          <Input
                            type="file"
                            accept=".pdf"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(lang.code, file);
                            }}
                            className="cursor-pointer"
                          />
                          {isUploading && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Uploaden...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Publieke aanvraaglink</CardTitle>
              <CardDescription>
                Genereer een link waarmee exposanten online een stand kunnen aanvragen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requestToken ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant={requestsEnabled ? 'default' : 'secondary'}>
                      {requestsEnabled ? 'Actief' : 'Uitgeschakeld'}
                    </Badge>
                    {canManageSettings && (
                      <Button variant="outline" size="sm" onClick={toggleRequests}>
                        {requestsEnabled ? 'Uitschakelen' : 'Inschakelen'}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}/request/${requestToken}`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" onClick={copyLink}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Deel deze link met exposanten. Ze kunnen dan een stand aanvragen zonder in te loggen.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Er is nog geen aanvraaglink gegenereerd voor dit evenement.
                  </p>
                  {canManageSettings && (
                    <Button onClick={generateRequestToken}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Genereer link
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>E-mail templates</CardTitle>
              <CardDescription>Configureer e-mail templates voor dit evenement.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                E-mail configuratie komt binnenkort beschikbaar.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Online betalen</CardTitle>
              <CardDescription>Configureer online betalingen voor dit evenement.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Online betaling configuratie komt binnenkort beschikbaar.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
