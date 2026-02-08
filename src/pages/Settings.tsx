import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Building2, Bell, Globe } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account data
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);

  // Profile data
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Preferences (stored locally for now)
  const [language, setLanguage] = useState('nl');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [eventUpdates, setEventUpdates] = useState(true);
  const [requestAlerts, setRequestAlerts] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, account_id')
        .eq('id', user!.id)
        .single();

      if (profile) {
        setProfileName(profile.name || '');
        setProfileEmail(profile.email || '');
        setAccountId(profile.account_id);

        // Fetch account if exists
        if (profile.account_id) {
          const { data: account } = await supabase
            .from('accounts')
            .select('name')
            .eq('id', profile.account_id)
            .single();
          if (account) setAccountName(account.name);
        }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: profileName })
        .eq('id', user.id);

      if (error) throw error;
      toast({ title: 'Opgeslagen', description: 'Je profiel is bijgewerkt.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ name: accountName })
        .eq('id', accountId);

      if (error) throw error;
      toast({ title: 'Opgeslagen', description: 'Accountgegevens zijn bijgewerkt.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Instellingen</h1>
        <p className="text-muted-foreground">Beheer je account en voorkeuren</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="w-4 h-4" />
            Algemeen
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notificaties
          </TabsTrigger>
          <TabsTrigger value="language" className="gap-2">
            <Globe className="w-4 h-4" />
            Taal
          </TabsTrigger>
        </TabsList>

        {/* General tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Profile card */}
          <Card>
            <CardHeader>
              <CardTitle>Profiel</CardTitle>
              <CardDescription>Je persoonlijke gegevens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName">Naam</Label>
                <Input
                  id="profileName"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileEmail">E-mail</Label>
                <Input
                  id="profileEmail"
                  value={profileEmail}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  E-mailadres kan niet worden gewijzigd.
                </p>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Opslaan
              </Button>
            </CardContent>
          </Card>

          {/* Account card */}
          {accountId && (
            <Card>
              <CardHeader>
                <CardTitle>Organisatie</CardTitle>
                <CardDescription>Instellingen van je organisatie-account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Bedrijfsnaam</Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveAccount} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Opslaan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notifications tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notificatie-voorkeuren</CardTitle>
              <CardDescription>Bepaal welke meldingen je wilt ontvangen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">E-mail notificaties</p>
                  <p className="text-sm text-muted-foreground">Ontvang meldingen per e-mail</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Evenement updates</p>
                  <p className="text-sm text-muted-foreground">Wijzigingen aan evenementen waar je lid van bent</p>
                </div>
                <Switch checked={eventUpdates} onCheckedChange={setEventUpdates} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Nieuwe aanvragen</p>
                  <p className="text-sm text-muted-foreground">Melding bij nieuwe standaanvragen</p>
                </div>
                <Switch checked={requestAlerts} onCheckedChange={setRequestAlerts} />
              </div>
              <p className="text-xs text-muted-foreground border-t border-border pt-4">
                Notificatie-instellingen worden lokaal opgeslagen. Volledige e-mail notificaties worden binnenkort ondersteund.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Language tab */}
        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle>Taalinstellingen</CardTitle>
              <CardDescription>Kies je voorkeurstaal voor de applicatie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Applicatietaal</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                    <SelectItem value="fr">🇫🇷 Frans</SelectItem>
                    <SelectItem value="en">🇬🇧 Engels</SelectItem>
                    <SelectItem value="de">🇩🇪 Duits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Meertalige ondersteuning wordt binnenkort volledig ondersteund. De interface is momenteel in het Nederlands.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
