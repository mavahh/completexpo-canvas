import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ModuleConfig } from '@/lib/modules';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ModuleTileProps {
  module: ModuleConfig;
  eventId: string | null;
  isDisabled: boolean;
  disabledReason?: string;
}

export function ModuleTile({ module, eventId, isDisabled, disabledReason }: ModuleTileProps) {
  const Icon = module.icon;
  const href = module.buildHref(eventId);
  
  const tileContent = (
    <div
      className={cn(
        'group relative flex flex-col p-4 sm:p-6 rounded-xl border transition-all duration-200',
        'bg-card hover:bg-accent/50 min-h-[120px] sm:min-h-[160px]',
        isDisabled 
          ? 'opacity-60 cursor-not-allowed border-border' 
          : 'border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer active:scale-[0.98]'
      )}
    >
      {module.comingSoon && (
        <Badge 
          variant="secondary" 
          className="absolute top-2 right-2 sm:top-3 sm:right-3 text-[10px] sm:text-xs"
        >
          Coming soon
        </Badge>
      )}
      
      <div className={cn(
        'w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4 transition-colors',
        isDisabled 
          ? 'bg-muted text-muted-foreground' 
          : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
      )}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      
      <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
        {module.title}
      </h3>
      
      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
        {module.description}
      </p>
    </div>
  );

  if (isDisabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{tileContent}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{disabledReason || 'Niet beschikbaar'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link to={href}>
      {tileContent}
    </Link>
  );
}
