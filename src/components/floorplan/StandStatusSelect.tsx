import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { StandStatus, STAND_STATUS_CONFIG } from './StandLegend';

interface StandStatusSelectProps {
  value: StandStatus;
  onChange: (status: StandStatus) => void;
  disabled?: boolean;
}

export function StandStatusSelect({ value, onChange, disabled }: StandStatusSelectProps) {
  const statuses: StandStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'];

  return (
    <div className="space-y-2">
      <Label>Status</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: STAND_STATUS_CONFIG[value].color }}
            />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: STAND_STATUS_CONFIG[status].color }}
                />
                {STAND_STATUS_CONFIG[status].label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
