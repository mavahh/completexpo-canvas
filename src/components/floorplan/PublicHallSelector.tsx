import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import type { Floorplan, Stand } from '@/types';
import { StandStatus } from './StandLegend';

interface PublicHallSelectorProps {
  floorplans: Floorplan[];
  selectedFloorplanId: string | null;
  stands: Stand[];
  statusCounts: Record<StandStatus, number>;
  onSelect: (id: string) => void;
}

export function PublicHallSelector({
  floorplans,
  selectedFloorplanId,
  stands,
  statusCounts,
  onSelect,
}: PublicHallSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Hallen / Layouts
      </h3>
      <div className="space-y-1">
        {floorplans.map((fp) => {
          const isActive = fp.id === selectedFloorplanId;
          const standCount = stands.length;

          return (
            <button
              key={fp.id}
              onClick={() => onSelect(fp.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg transition-colors',
                'flex items-center justify-between gap-2',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted text-foreground'
              )}
            >
              <span className="font-medium truncate">{fp.name}</span>
              <div className="flex items-center gap-1">
                {isActive && (
                  <>
                    <Badge variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground">
                      {statusCounts.SOLD || 0} verkocht
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground">
                      {statusCounts.AVAILABLE || 0} vrij
                    </Badge>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
