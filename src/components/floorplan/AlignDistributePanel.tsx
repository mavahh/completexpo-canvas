import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterHorizontal,
  AlignCenterVertical,
  GripHorizontal,
  GripVertical,
  Grid3X3,
} from 'lucide-react';
import { AlignmentType, DistributionType } from '@/hooks/floorplan/alignmentUtils';

interface AlignDistributePanelProps {
  selectedCount: number;
  onAlign: (type: AlignmentType) => void;
  onDistribute: (type: DistributionType) => void;
  onSnapToGrid: () => void;
  disabled?: boolean;
}

export function AlignDistributePanel({
  selectedCount,
  onAlign,
  onDistribute,
  onSnapToGrid,
  disabled = false,
}: AlignDistributePanelProps) {
  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Uitlijnen & verdelen</span>
        <Badge variant="secondary" className="text-xs">
          {selectedCount} geselecteerd
        </Badge>
      </div>
      
      <div className="grid grid-cols-6 gap-1">
        {/* Align buttons */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('left')}
          disabled={disabled || !canAlign}
          title="Lijn links uit"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('centerH')}
          disabled={disabled || !canAlign}
          title="Centreer horizontaal"
        >
          <AlignCenterHorizontal className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('right')}
          disabled={disabled || !canAlign}
          title="Lijn rechts uit"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('top')}
          disabled={disabled || !canAlign}
          title="Lijn boven uit"
        >
          <AlignStartVertical className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('centerV')}
          disabled={disabled || !canAlign}
          title="Centreer verticaal"
        >
          <AlignCenterVertical className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('bottom')}
          disabled={disabled || !canAlign}
          title="Lijn onder uit"
        >
          <AlignEndVertical className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={() => onDistribute('horizontal')}
          disabled={disabled || !canDistribute}
          title="Verdeel horizontaal (min. 3 stands)"
        >
          <GripHorizontal className="w-3.5 h-3.5 mr-1" />
          H
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={() => onDistribute('vertical')}
          disabled={disabled || !canDistribute}
          title="Verdeel verticaal (min. 3 stands)"
        >
          <GripVertical className="w-3.5 h-3.5 mr-1" />
          V
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={onSnapToGrid}
          disabled={disabled || selectedCount < 1}
          title="Snap naar grid"
        >
          <Grid3X3 className="w-3.5 h-3.5 mr-1" />
          Grid
        </Button>
      </div>
    </div>
  );
}
