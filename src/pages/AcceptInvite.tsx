import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, UserPlus } from 'lucide-react';

interface Invite {
  id: string;
  type: string;
  email: string;
  account_id: string | null;
  event_id: string | null;
  payload: any;
  expires_at: string;
  accepted_at: string | null;
}

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signUp, signIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    if (!token) {
      setError('Geen uitnodigingstoken gevonden');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('invites')
        .select('*')
        .eq('token', token)
        .single();

      if (fetchError || !data) {
        setError('Uitnodiging niet gevonden of ongeldig');
        setLoading(false);
        return;
      }

      // Check if already accepted
      if (data.accepted_at) {
        setError('Deze uitnodiging is al geaccepteerd');
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('Deze uitnodiging is verlopen');
        setLoading(false);
        return;
      }

      setInvite(data as Invite);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;

    if (formData.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: 'Wachtwoord moet minimaal 6 tekens bevatten',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: 'Wachtwoorden komen niet overeen',
      });
      return;
    }

    setProcessing(true);

    try {
      // Sign up the user
      const { error: signUpError } = await signUp(
        invite.email,
        formData.password,
        formData.name
      );

      if (signUpError) {
        // If user already exists, try to sign in
        if (signUpError.message.includes('already registered')) {
          const { error: signInError } = await signIn(invite.email, formData.password);
          if (signInError) {
            throw new Error('Dit e-mailadres is al geregistreerd. Gebruik het juiste wachtwoord of reset je wachtwoord.');
          }
        } else {
          throw signUpError;
        }
      } else {
        // Auto sign in after signup
        await signIn(invite.email, formData.password);
      }

      // Get the current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Kon gebruiker niet ophalen na registratie');
      }

      // Mark invite as accepted
      await supabase
        .from('invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      // Handle based on invite type
      if (invite.type === 'DEMO_APPROVAL') {
        // Create account and make user owner
        const companyName = invite.payload?.company_name || invite.payload?.companyName || 'Mijn Organisatie';
        
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .insert({
            name: companyName,
            status: 'approved',
            approved_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (accountError) throw accountError;

        // Update profile with account
        await supabase
          .from('profiles')
          .update({
            account_id: accountData.id,
            is_account_admin: true,
            name: formData.name,
          })
          .eq('id', currentUser.id);

        // Add as account owner
        await supabase
          .from('account_members')
          .insert({
            account_id: accountData.id,
            user_id: currentUser.id,
            role: 'OWNER',
          });

        toast({
          title: 'Account geactiveerd!',
          description: `Welkom bij ${companyName}`,
        });
      } else if (invite.type === 'ACCOUNT_INVITE' && invite.account_id) {
        // Link user to account
        const role = invite.payload?.accountRole || 'MEMBER';
        
        await supabase
          .from('profiles')
          .update({
            account_id: invite.account_id,
            is_account_admin: role === 'OWNER' || role === 'ADMIN',
            name: formData.name,
          })
          .eq('id', currentUser.id);

        // Add to account_members
        await supabase
          .from('account_members')
          .insert({
            account_id: invite.account_id,
            user_id: currentUser.id,
            role: role,
          });

        // If event access was included
        if (invite.payload?.eventIds && invite.payload.eventIds.length > 0) {
          const eventMembers = invite.payload.eventIds.map((eventId: string) => ({
            event_id: eventId,
            user_id: currentUser.id,
            role: invite.payload.eventRole || 'USER',
          }));

          await supabase.from('event_members').insert(eventMembers);
        }

        toast({
          title: 'Uitnodiging geaccepteerd!',
          description: 'Je hebt nu toegang tot de organisatie',
        });
      } else if (invite.type === 'EVENT_INVITE' && invite.event_id) {
        // Add user to event
        await supabase
          .from('event_members')
          .insert({
            event_id: invite.event_id,
            user_id: currentUser.id,
            role: invite.payload?.eventRole || 'USER',
          });

        // Also link to account if specified
        if (invite.account_id) {
          await supabase
            .from('profiles')
            .update({
              account_id: invite.account_id,
              name: formData.name,
            })
            .eq('id', currentUser.id);

          await supabase
            .from('account_members')
            .upsert({
              account_id: invite.account_id,
              user_id: currentUser.id,
              role: 'MEMBER',
            });
        }

        toast({
          title: 'Uitnodiging geaccepteerd!',
          description: 'Je hebt nu toegang tot het evenement',
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: err.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Uitnodiging ongeldig</CardTitle>
            <CardDescription className="mt-2">{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/')} className="w-full">
              Naar home
            </Button>
            <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
              Inloggen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    // Already logged in - handle differently
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Je bent al ingelogd</CardTitle>
            <CardDescription className="mt-2">
              Je bent ingelogd als {user.email}. Wil je deze uitnodiging accepteren met dit account?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleSubmit} disabled={processing} className="w-full">
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Uitnodiging accepteren
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              Naar dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Uitnodiging accepteren</CardTitle>
          <CardDescription>
            Je bent uitgenodigd voor {invite?.email}. Maak een wachtwoord aan om je account te activeren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Je naam *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Voornaam Achternaam"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={invite?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimaal 6 tekens"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bevestig wachtwoord *</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Herhaal je wachtwoord"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Account activeren
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
