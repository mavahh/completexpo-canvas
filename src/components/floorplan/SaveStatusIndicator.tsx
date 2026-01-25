import { Badge } from '@/components/ui/badge';
import { Check, Loader2, AlertCircle, CloudOff } from 'lucide-react';
import { SaveStatus } from '@/hooks/floorplan/useAutosave';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSavedAt: Date | null;
}

export function SaveStatusIndicator({ status, lastSavedAt }: SaveStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saved':
        return {
          icon: <Check className="w-3 h-3" />,
          text: 'Opgeslagen',
          variant: 'secondary' as const,
          className: 'text-success',
        };
      case 'saving':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: 'Opslaan...',
          variant: 'secondary' as const,
          className: '',
        };
      case 'unsaved':
        return {
          icon: <CloudOff className="w-3 h-3" />,
          text: 'Niet opgeslagen',
          variant: 'outline' as const,
          className: 'text-warning',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          text: 'Fout',
          variant: 'destructive' as const,
          className: '',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1 text-xs ${config.className}`}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.text}</span>
      {status === 'saved' && lastSavedAt && (
        <span className="hidden md:inline text-[10px] opacity-70 ml-1">
          {format(lastSavedAt, 'HH:mm', { locale: nl })}
        </span>
      )}
    </Badge>
  );
}
