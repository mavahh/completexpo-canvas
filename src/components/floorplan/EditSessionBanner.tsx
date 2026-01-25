import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users } from 'lucide-react';

interface EditSessionBannerProps {
  editorNames: string[];
}

export function EditSessionBanner({ editorNames }: EditSessionBannerProps) {
  if (editorNames.length === 0) return null;

  const displayNames = editorNames.slice(0, 2);
  const remaining = editorNames.length - 2;

  let message = '';
  if (editorNames.length === 1) {
    message = `${displayNames[0]} is ook aan het bewerken`;
  } else if (remaining > 0) {
    message = `${displayNames.join(', ')} en ${remaining} anderen zijn ook aan het bewerken`;
  } else {
    message = `${displayNames.join(' en ')} zijn ook aan het bewerken`;
  }

  return (
    <Alert variant="default" className="py-2 border-warning/50 bg-warning/10">
      <Users className="h-4 w-4 text-warning" />
      <AlertDescription className="text-xs">
        {message}
      </AlertDescription>
    </Alert>
  );
}
