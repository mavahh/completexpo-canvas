import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { QUICK_ACTIONS } from '@/lib/modules';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuickActionsCardProps {
  eventId: string | null;
}

export function QuickActionsCard({ eventId }: QuickActionsCardProps) {
  const { hasPermission, isSystemAdmin } = usePermissions();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-4 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-medium">
          <Zap className="w-4 h-4 text-primary" />
          Snelle acties
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:pt-0 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const needsEvent = action.requiresEvent && !eventId;
          const hasAccess = isSystemAdmin || !action.requiredPermission || hasPermission(action.requiredPermission);
          const isDisabled = needsEvent || !hasAccess;
          
          const disabledReason = needsEvent 
            ? 'Selecteer eerst een event' 
            : !hasAccess 
              ? 'Geen toegang' 
              : undefined;

          const button = (
            <Button
              variant="outline"
              size="sm"
              disabled={isDisabled}
              className="gap-2"
              asChild={!isDisabled}
            >
              {isDisabled ? (
                <>
                  <Icon className="w-4 h-4" />
                  {action.title}
                </>
              ) : (
                <Link to={action.href(eventId)}>
                  <Icon className="w-4 h-4" />
                  {action.title}
                </Link>
              )}
            </Button>
          );

          if (isDisabled && disabledReason) {
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  {button}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{disabledReason}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return <span key={action.id}>{button}</span>;
        })}
      </CardContent>
    </Card>
  );
}
