import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface AutoLabelingModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (config: LabelingConfig) => void;
  selectedCount: number;
  totalCount: number;
}

export interface LabelingConfig {
  prefix: string;
  startNumber: number;
  padding: number;
  applyToSelected: boolean;
}

export function AutoLabelingModal({
  open,
  onClose,
  onApply,
  selectedCount,
  totalCount,
}: AutoLabelingModalProps) {
  const [prefix, setPrefix] = useState('A');
  const [startNumber, setStartNumber] = useState(1);
  const [padding, setPadding] = useState(2);
  const [applyToSelected, setApplyToSelected] = useState(selectedCount > 0);

  const handleApply = () => {
    onApply({
      prefix,
      startNumber,
      padding,
      applyToSelected: applyToSelected && selectedCount > 0,
    });
    onClose();
  };

  const previewLabel = (index: number) => {
    const num = startNumber + index;
    return `${prefix}${num.toString().padStart(padding, '0')}`;
  };

  const targetCount = applyToSelected && selectedCount > 0 ? selectedCount : totalCount;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Labels genereren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prefix">Prefix</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="A, B, HAL1-..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startNumber">Startnummer</Label>
              <Input
                id="startNumber"
                type="number"
                min={1}
                value={startNumber}
                onChange={(e) => setStartNumber(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="padding">Padding (cijfers)</Label>
              <Input
                id="padding"
                type="number"
                min={0}
                max={5}
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
              />
            </div>
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="applyToSelected"
                checked={applyToSelected}
                onCheckedChange={(checked) => setApplyToSelected(!!checked)}
              />
              <Label htmlFor="applyToSelected" className="text-sm cursor-pointer">
                Alleen toepassen op selectie ({selectedCount} stands)
              </Label>
            </div>
          )}

          <div className="bg-muted rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-2">Voorbeeld:</p>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2].filter(i => i < targetCount).map((i) => (
                <span
                  key={i}
                  className="text-sm font-mono bg-background px-2 py-1 rounded border border-border"
                >
                  {previewLabel(i)}
                </span>
              ))}
              {targetCount > 3 && (
                <span className="text-sm text-muted-foreground">
                  ... tot {previewLabel(targetCount - 1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleApply}>
            Toepassen op {targetCount} stands
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
