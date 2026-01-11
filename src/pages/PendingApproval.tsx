import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

export default function PendingApproval() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle>Aanvraag in behandeling</CardTitle>
          <CardDescription className="mt-2">
            Je demo-aanvraag wordt momenteel bekeken. We nemen zo snel mogelijk contact met je op via e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dit duurt meestal minder dan 24 uur. Controleer ook je spam folder.
          </p>
          <Button onClick={handleSignOut} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            Uitloggen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
