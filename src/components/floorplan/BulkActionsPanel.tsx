import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { StandStatusSelect } from './StandStatusSelect';
import { StandStatus } from './StandLegend';
import { AlignDistributePanel } from './AlignDistributePanel';
import { AlignmentType, DistributionType } from '@/hooks/floorplan/alignmentUtils';
import { 
  Grid3X3, 
  RotateCw, 
  X, 
  Download,
  UserX,
  Copy
} from 'lucide-react';

interface BulkActionsPanelProps {
  selectedCount: number;
  onSetStatus: (status: StandStatus) => void;
  onSnapToGrid: () => void;
  onClearExhibitor: () => void;
  onRotate: (degrees: number) => void;
  onExportLabels: () => void;
  onClearSelection: () => void;
  onDuplicate?: () => void;
  onAlign?: (type: AlignmentType) => void;
  onDistribute?: (type: DistributionType) => void;
  disabled?: boolean;
}

export function BulkActionsPanel({
  selectedCount,
  onSetStatus,
  onSnapToGrid,
  onClearExhibitor,
  onRotate,
  onExportLabels,
  onClearSelection,
  onDuplicate,
  onAlign,
  onDistribute,
  disabled = false,
}: BulkActionsPanelProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">
          Bulk selectie ({selectedCount})
        </h4>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Status instellen</Label>
          <StandStatusSelect
            value="AVAILABLE"
            onChange={(status) => onSetStatus(status)}
            disabled={disabled}
          />
        </div>

        {/* Align & Distribute */}
        {onAlign && onDistribute && (
          <AlignDistributePanel
            selectedCount={selectedCount}
            onAlign={onAlign}
            onDistribute={onDistribute}
            onSnapToGrid={onSnapToGrid}
            disabled={disabled}
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          {onDuplicate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              disabled={disabled}
              className="text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Dupliceer
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearExhibitor}
            disabled={disabled}
            className="text-xs"
          >
            <UserX className="w-3 h-3 mr-1" />
            Ontkoppel
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRotate(90)}
            disabled={disabled}
            className="text-xs"
          >
            <RotateCw className="w-3 h-3 mr-1" />
            +90°
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRotate(-90)}
            disabled={disabled}
            className="text-xs"
          >
            <RotateCw className="w-3 h-3 mr-1 scale-x-[-1]" />
            -90°
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportLabels}
          className="w-full text-xs"
        >
          <Download className="w-3 h-3 mr-1" />
          Export labels CSV
        </Button>
      </div>
    </Card>
  );
}