import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown } from 'lucide-react';
import { StandPreset, STAND_PRESETS } from '@/hooks/floorplan/useStandPresets';

interface StandPresetSelectorProps {
  onSelectPreset: (preset: StandPreset) => void;
  onAddDefault: () => void;
  disabled?: boolean;
}

export function StandPresetSelector({
  onSelectPreset,
  onAddDefault,
  disabled = false,
}: StandPresetSelectorProps) {
  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        onClick={onAddDefault}
        disabled={disabled}
        className="rounded-r-none border-r-0"
      >
        <Plus className="w-4 h-4 mr-1" />
        Stand
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="rounded-l-none px-2"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {STAND_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{preset.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {preset.description}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
