import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PerformanceModeToggleProps {
  performanceMode: boolean;
  onToggle: (enabled: boolean) => void;
}

export function PerformanceModeToggle({
  performanceMode,
  onToggle,
}: PerformanceModeToggleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={performanceMode ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          title="Performance mode"
        >
          <Zap className={`w-4 h-4 ${performanceMode ? 'text-warning' : ''}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="perf-mode" className="text-sm font-medium">
              Performance mode
            </Label>
            <Switch
              id="perf-mode"
              checked={performanceMode}
              onCheckedChange={onToggle}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Verbergt achtergrond en iconen tijdens het slepen voor vloeiendere prestaties bij grote plattegronden.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
