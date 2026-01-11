import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export type StandStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED';

export const STAND_STATUS_CONFIG: Record<StandStatus, { label: string; color: string; bgColor: string }> = {
  AVAILABLE: {
    label: 'Available',
    color: 'hsl(199, 89%, 48%)',
    bgColor: 'bg-info',
  },
  RESERVED: {
    label: 'Reserved',
    color: 'hsl(38, 92%, 50%)',
    bgColor: 'bg-warning',
  },
  SOLD: {
    label: 'Sold',
    color: 'hsl(142, 76%, 36%)',
    bgColor: 'bg-success',
  },
  BLOCKED: {
    label: 'Blocked',
    color: 'hsl(220, 9%, 46%)',
    bgColor: 'bg-muted-foreground',
  },
};

interface StandLegendProps {
  filters: Record<StandStatus, boolean>;
  onFilterChange: (status: StandStatus, checked: boolean) => void;
  counts?: Record<StandStatus, number>;
}

export function StandLegend({ filters, onFilterChange, counts }: StandLegendProps) {
  const statuses: StandStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'];

  return (
    <Card className="p-4">
      <h4 className="text-sm font-medium text-foreground mb-3">Legend & Filters</h4>
      <div className="space-y-2">
        {statuses.map((status) => {
          const config = STAND_STATUS_CONFIG[status];
          const count = counts?.[status] ?? 0;
          
          return (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`filter-${status}`}
                  checked={filters[status]}
                  onCheckedChange={(checked) => onFilterChange(status, !!checked)}
                />
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: config.color }}
                />
                <Label 
                  htmlFor={`filter-${status}`}
                  className="text-sm text-foreground cursor-pointer"
                >
                  {config.label}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}