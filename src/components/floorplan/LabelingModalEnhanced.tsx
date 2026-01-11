import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tag, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface LabelingConfigEnhanced {
  mode: 'prefix' | 'numeric';
  prefix: string;
  startNumber: number;
  padding: number;
  applyToSelected: boolean;
  skipDuplicates: boolean;
}

export interface LabelingResult {
  assigned: number;
  skipped: number;
  duplicatesResolved: number;
}

interface LabelingModalEnhancedProps {
  open: boolean;
  onClose: () => void;
  onApply: (config: LabelingConfigEnhanced) => LabelingResult;
  selectedCount: number;
  totalCount: number;
  existingLabels: string[];
}

export function LabelingModalEnhanced({
  open,
  onClose,
  onApply,
  selectedCount,
  totalCount,
  existingLabels,
}: LabelingModalEnhancedProps) {
  const [mode, setMode] = useState<'prefix' | 'numeric'>('prefix');
  const [prefix, setPrefix] = useState('A');
  const [startNumber, setStartNumber] = useState(1);
  const [padding, setPadding] = useState(0);
  const [applyToSelected, setApplyToSelected] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<LabelingResult | null>(null);

  const targetCount = applyToSelected && selectedCount > 0 ? selectedCount : totalCount;

  const generatePreview = (index: number): string => {
    const num = startNumber + index;
    if (mode === 'prefix') {
      return `${prefix}${num.toString().padStart(padding, '0')}`;
    } else {
      return num.toString().padStart(padding, '0');
    }
  };

  const handleApply = () => {
    const config: LabelingConfigEnhanced = {
      mode,
      prefix: mode === 'prefix' ? prefix : '',
      startNumber,
      padding,
      applyToSelected,
      skipDuplicates,
    };
    const res = onApply(config);
    setResult(res);
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Labels genereren
          </DialogTitle>
          <DialogDescription>
            Genereer automatisch labels voor {targetCount} stands
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <p className="font-medium">Resultaat:</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>✓ {result.assigned} labels toegekend</li>
                  {result.skipped > 0 && (
                    <li>⏭ {result.skipped} overgeslagen (duplicaat)</li>
                  )}
                  {result.duplicatesResolved > 0 && (
                    <li>🔄 {result.duplicatesResolved} duplicaten opgelost</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={handleClose}>Sluiten</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              {/* Mode selection */}
              <div className="space-y-3">
                <Label>Labeling mode</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'prefix' | 'numeric')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="prefix" id="prefix-mode" />
                    <Label htmlFor="prefix-mode" className="cursor-pointer">
                      Prefix + nummer (bijv. A1, A2, A3...)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="numeric" id="numeric-mode" />
                    <Label htmlFor="numeric-mode" className="cursor-pointer">
                      Alleen nummers (bijv. 101, 102, 103...)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Prefix input (only for prefix mode) */}
              {mode === 'prefix' && (
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input
                    id="prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="A"
                    className="w-24"
                  />
                </div>
              )}

              {/* Start number */}
              <div className="space-y-2">
                <Label htmlFor="startNumber">Startnummer</Label>
                <Input
                  id="startNumber"
                  type="number"
                  min={0}
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
              </div>

              {/* Padding */}
              <div className="space-y-2">
                <Label htmlFor="padding">Nul-padding (aantal cijfers)</Label>
                <Input
                  id="padding"
                  type="number"
                  min={0}
                  max={5}
                  value={padding}
                  onChange={(e) => setPadding(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  0 = geen padding, 3 = 001, 002, etc.
                </p>
              </div>

              {/* Preview */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Voorbeeld:</p>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="px-2 py-1 bg-background rounded text-sm font-mono">
                      {generatePreview(i)}
                    </span>
                  ))}
                  <span className="text-muted-foreground">...</span>
                </div>
              </div>

              {/* Apply to selection */}
              {selectedCount > 0 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="applyToSelected"
                    checked={applyToSelected}
                    onCheckedChange={(checked) => setApplyToSelected(checked === true)}
                  />
                  <Label htmlFor="applyToSelected" className="cursor-pointer">
                    Alleen toepassen op selectie ({selectedCount} stands)
                  </Label>
                </div>
              )}

              {/* Skip duplicates */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                />
                <Label htmlFor="skipDuplicates" className="cursor-pointer">
                  Bestaande labels overslaan bij conflicten
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Annuleren
              </Button>
              <Button onClick={handleApply}>
                <Tag className="w-4 h-4 mr-2" />
                Toepassen
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
