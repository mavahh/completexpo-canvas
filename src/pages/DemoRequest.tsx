import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Building2, Eye, EyeOff } from 'lucide-react';

export default function DemoRequest() {
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: user?.user_metadata?.name || '',
    email: user?.email || '',
    phone: '',
    reason: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userId = user?.id || null;

      // If user is not logged in, create an account first
      if (!user) {
        if (formData.password.length < 6) {
          throw new Error('Wachtwoord moet minimaal 6 tekens bevatten');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Wachtwoorden komen niet overeen');
        }

        // Sign up the user
        const { error: signUpError } = await signUp(
          formData.email,
          formData.password,
          formData.contact_name
        );

        if (signUpError) {
          // Check if user already exists
          if (signUpError.message.includes('already registered')) {
            throw new Error('Dit e-mailadres is al geregistreerd. Log in of gebruik een ander e-mailadres.');
          }
          throw signUpError;
        }

        // Auto sign in after signup (since auto-confirm is enabled)
        const { error: signInError } = await signIn(formData.email, formData.password);
        if (signInError) {
          // User was created but couldn't sign in - they might need to confirm email
          toast({
            title: 'Account aangemaakt',
            description: 'Je account is aangemaakt. Controleer je e-mail voor bevestiging of log in.',
          });
        }

        // Get the current user after sign in
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        userId = currentUser?.id || null;
      }

      // Create demo request
      const { error } = await supabase.from('demo_requests').insert({
        user_id: userId,
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone || null,
        reason: formData.reason || null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Aanvraag verstuurd',
        description: 'We nemen zo snel mogelijk contact met je op.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Aanvraag ontvangen!</CardTitle>
            <CardDescription>
              Bedankt voor je interesse in Completexpo. We bekijken je aanvraag en nemen binnen 24 uur contact met je op.
              {user && (
                <span className="block mt-2">
                  Je kunt nu inloggen met je account. Zodra je aanvraag is goedgekeurd, krijg je toegang tot alle functies.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {user ? (
              <Button onClick={() => navigate('/pending-approval')} className="w-full">
                Bekijk aanvraagstatus
              </Button>
            ) : (
              <Button onClick={() => navigate('/login')} className="w-full">
                Naar inloggen
              </Button>
            )}
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Terug naar home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Demo aanvragen</CardTitle>
          <CardDescription>
            {user 
              ? 'Vul het formulier in om een demo account aan te vragen.'
              : 'Maak een account aan en vraag toegang tot Completexpo.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Bedrijfsnaam *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Jouw bedrijf B.V."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">Contactpersoon *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Voornaam Achternaam"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@bedrijf.nl"
                required
                disabled={!!user}
              />
            </div>

            {/* Password fields - only show for new users */}
            {!user && (
              <>
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Telefoonnummer</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+31 6 12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Waarvoor wil je Completexpo gebruiken?</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Vertel ons over je beurzen, evenementen of gebruik..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {user ? 'Demo aanvragen' : 'Account aanmaken & demo aanvragen'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Door je aan te melden ga je akkoord met onze voorwaarden.
            </p>

            {!user && (
              <p className="text-sm text-center text-muted-foreground">
                Al een account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary hover:underline"
                >
                  Log in
                </button>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
