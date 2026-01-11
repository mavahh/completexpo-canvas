import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Loader2 } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  eventName: string;
  floorplanName: string;
}

export interface ExportOptions {
  format: 'png' | 'pdf';
  includeLegend: boolean;
  includeTitle: boolean;
  hideGrid: boolean;
}

export function ExportDialog({
  open,
  onClose,
  onExport,
  eventName,
  floorplanName,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'pdf'>('png');
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [hideGrid, setHideGrid] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport({
        format,
        includeLegend,
        includeTitle,
        hideGrid,
      });
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plattegrond exporteren</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Formaat</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'png' | 'pdf')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png" className="font-normal cursor-pointer">
                  PNG (afbeelding)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">
                  PDF (document)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Opties</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTitle"
                  checked={includeTitle}
                  onCheckedChange={(c) => setIncludeTitle(!!c)}
                />
                <Label htmlFor="includeTitle" className="font-normal text-sm cursor-pointer">
                  Titel en datum toevoegen
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeLegend"
                  checked={includeLegend}
                  onCheckedChange={(c) => setIncludeLegend(!!c)}
                />
                <Label htmlFor="includeLegend" className="font-normal text-sm cursor-pointer">
                  Legenda toevoegen
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hideGrid"
                  checked={hideGrid}
                  onCheckedChange={(c) => setHideGrid(!!c)}
                />
                <Label htmlFor="hideGrid" className="font-normal text-sm cursor-pointer">
                  Raster verbergen
                </Label>
              </div>
            </div>
          </div>

          <div className="bg-muted rounded-md p-3">
            <p className="text-xs text-muted-foreground">
              Export: <span className="font-medium">{eventName}</span> - {floorplanName}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Annuleren
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exporteren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
