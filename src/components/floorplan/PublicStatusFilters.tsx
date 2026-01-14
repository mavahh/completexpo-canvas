import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { STAND_STATUS_CONFIG, StandStatus } from './StandLegend';
import { Filter } from 'lucide-react';

interface PublicStatusFiltersProps {
  filters: Record<StandStatus, boolean>;
  counts: Record<StandStatus, number>;
  onChange: (status: StandStatus, checked: boolean) => void;
}

export function PublicStatusFilters({ filters, counts, onChange }: PublicStatusFiltersProps) {
  const statuses: StandStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Legenda & Filters
      </h3>
      <div className="space-y-2">
        {statuses.map((status) => {
          const config = STAND_STATUS_CONFIG[status];
          const count = counts[status] || 0;

          return (
            <div key={status} className="flex items-center gap-3">
              <Checkbox
                id={`filter-${status}`}
                checked={filters[status]}
                onCheckedChange={(checked) => onChange(status, checked as boolean)}
              />
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: config.color }}
              />
              <Label
                htmlFor={`filter-${status}`}
                className="flex-1 text-sm cursor-pointer"
              >
                {config.label}
              </Label>
              <span className="text-xs text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
