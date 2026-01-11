import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens bevatten'),
});

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = loginSchema.parse({ email, password });

      if (isSignUp) {
        const { error } = await signUp(validated.email, validated.password, name);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Registratie mislukt',
            description: error.message === 'User already registered' 
              ? 'Dit e-mailadres is al geregistreerd' 
              : error.message,
          });
        } else {
          toast({
            title: 'Account aangemaakt',
            description: 'Je kunt nu inloggen met je nieuwe account.',
          });
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(validated.email, validated.password);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Inloggen mislukt',
            description: 'Ongeldige inloggegevens',
          });
        } else {
          navigate('/home');
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validatiefout',
          description: err.errors[0].message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-xl">C</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Completexpo</h1>
            <p className="text-muted-foreground mt-2">
              {isSignUp ? 'Maak een nieuw account aan' : 'Log in op je account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Je naam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="je@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                'Registreren'
              ) : (
                'Inloggen'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? 'Heb je al een account? Log in' : 'Nog geen account? Registreer'}
            </button>
            
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Nieuw bij Completexpo?</p>
              <Link to="/demo-request">
                <Button variant="outline" className="w-full">
                  Demo aanvragen
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Demo: demo@expodoc.com / demo123
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            ← Terug naar home
          </Link>
        </p>
      </div>
    </div>
  );
}
