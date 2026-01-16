import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EventCardProps {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  exhibitorCount: number;
  status: 'active' | 'draft' | 'completed';
  gradient?: string;
}

const gradients = [
  'from-orange-400 to-amber-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-purple-400 to-pink-500',
  'from-rose-400 to-red-500',
];

export function EventCard({ 
  id, 
  name, 
  startDate, 
  endDate, 
  exhibitorCount, 
  status,
  gradient
}: EventCardProps) {
  const bgGradient = gradient || gradients[Math.floor(Math.random() * gradients.length)];

  const statusConfig = {
    active: { label: 'ACTIEF', className: 'bg-success text-success-foreground' },
    draft: { label: 'CONCEPT', className: 'bg-warning text-warning-foreground' },
    completed: { label: 'AFGEROND', className: 'bg-muted text-muted-foreground' },
  };

  return (
    <Link to={`/events/${id}`} className="block group">
      <div className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all">
        {/* Header with gradient */}
        <div className={cn('h-24 bg-gradient-to-r relative', bgGradient)}>
          <Badge className={cn('absolute top-3 right-3', statusConfig[status].className)}>
            {statusConfig[status].label}
          </Badge>
          
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h3 className="font-semibold text-lg truncate">{name}</h3>
            {startDate && (
              <p className="text-sm opacity-90">
                {format(new Date(startDate), 'd MMM', { locale: nl })}
                {endDate && ` - ${format(new Date(endDate), 'd MMM yyyy', { locale: nl })}`}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between bg-card">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Exposanten</p>
            <p className="text-lg font-bold text-foreground">{exhibitorCount}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
