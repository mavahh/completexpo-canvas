import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, Copy, Link2, Mail } from 'lucide-react';

interface Exhibitor {
  id: string;
  name: string;
  email: string | null;
}

interface ExhibitorInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  exhibitors: Exhibitor[];
  onInviteSent: () => void;
}

export function ExhibitorInviteDialog({
  open,
  onOpenChange,
  eventId,
  exhibitors,
  onInviteSent,
}: ExhibitorInviteDialogProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedExhibitorId, setSelectedExhibitorId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let exhibitorId: string | null = null;
      let exhibitorEmail = email;
      let exhibitorName = companyName;

      if (mode === 'existing') {
        const exhibitor = exhibitors.find((e) => e.id === selectedExhibitorId);
        if (!exhibitor) throw new Error('Selecteer een exposant');
        exhibitorId = exhibitor.id;
        exhibitorEmail = exhibitor.email || '';
        exhibitorName = exhibitor.name;
      }

      if (!exhibitorEmail) {
        throw new Error('E-mailadres is verplicht');
      }

      // Create portal token
      const token = crypto.randomUUID();
      const { error: tokenError } = await supabase
        .from('exhibitor_portal_tokens')
        .insert({
          event_id: eventId,
          exhibitor_id: exhibitorId,
          email: exhibitorEmail,
          token,
          enabled: true,
        });

      if (tokenError) throw tokenError;

      // Generate link
      const link = `${window.location.origin}/exhibitor/${token}`;

      // Create email outbox entry
      await supabase.from('email_outbox').insert({
        to_email: exhibitorEmail,
        subject: `Exposanten Portal - Vul je gegevens in`,
        body_text: `Beste,\n\nJe bent uitgenodigd voor het exposanten portal.\n\nKlik op de onderstaande link om je standgegevens en services in te vullen:\n${link}\n\nMet vriendelijke groet,\nHet Event Team`,
        meta: { 
          portal_link: link, 
          exhibitor_id: exhibitorId,
          company_name: exhibitorName,
        },
      });

      setGeneratedLink(link);
      onInviteSent();

      toast({
        title: 'Uitnodiging aangemaakt',
        description: 'Kopieer de link om te delen met de exposant.',
      });
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

  const copyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      toast({ title: 'Gekopieerd', description: 'Link is gekopieerd naar klembord' });
    }
  };

  const resetForm = () => {
    setMode('existing');
    setSelectedExhibitorId('');
    setEmail('');
    setCompanyName('');
    setGeneratedLink(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exposant uitnodigen</DialogTitle>
          <DialogDescription>
            Stuur een uitnodiging naar een exposant om hun gegevens in te vullen via het portal.
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-5 h-5 text-primary" />
                <span className="font-medium">Portal link aangemaakt</span>
              </div>
              <p className="text-sm text-muted-foreground break-all">{generatedLink}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyLink} className="flex-1 gap-2">
                <Copy className="w-4 h-4" />
                Kopieer link
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Nieuwe uitnodiging
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'existing' ? 'default' : 'outline'}
                onClick={() => setMode('existing')}
                className="flex-1"
              >
                Bestaande exposant
              </Button>
              <Button
                type="button"
                variant={mode === 'new' ? 'default' : 'outline'}
                onClick={() => setMode('new')}
                className="flex-1"
              >
                Nieuwe exposant
              </Button>
            </div>

            {mode === 'existing' ? (
              <div className="space-y-2">
                <Label>Selecteer exposant</Label>
                <Select value={selectedExhibitorId} onValueChange={setSelectedExhibitorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een exposant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {exhibitors.map((exhibitor) => (
                      <SelectItem key={exhibitor.id} value={exhibitor.id}>
                        {exhibitor.name} {exhibitor.email ? `(${exhibitor.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedExhibitorId && !exhibitors.find((e) => e.id === selectedExhibitorId)?.email && (
                  <div className="space-y-2">
                    <Label>E-mailadres (verplicht)</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@bedrijf.nl"
                      required
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Bedrijfsnaam</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Bedrijf B.V."
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mailadres *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@bedrijf.nl"
                    required
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Uitnodiging versturen
              </Button>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Annuleren
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
