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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';

export interface ExportOptionsEnhanced {
  format: 'png' | 'pdf';
  includeLegend: boolean;
  includeTitle: boolean;
  hideGrid: boolean;
  scale: number;
}

interface ExportDialogEnhancedProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptionsEnhanced) => Promise<void>;
  eventName: string;
  floorplanName: string;
}

export function ExportDialogEnhanced({
  open,
  onClose,
  onExport,
  eventName,
  floorplanName,
}: ExportDialogEnhancedProps) {
  const [format, setFormat] = useState<'png' | 'pdf'>('png');
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [hideGrid, setHideGrid] = useState(false);
  const [scale, setScale] = useState(2);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport({
        format,
        includeLegend,
        includeTitle,
        hideGrid,
        scale,
      });
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exporteren
          </DialogTitle>
          <DialogDescription>
            Exporteer {eventName} - {floorplanName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <Label>Formaat</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'png' | 'pdf')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png" className="flex items-center gap-2 cursor-pointer">
                  <FileImage className="w-4 h-4 text-muted-foreground" />
                  PNG afbeelding
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  PDF document
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Quality/Scale */}
          <div className="space-y-3">
            <Label htmlFor="scale">Kwaliteit / Schaal</Label>
            <Select value={String(scale)} onValueChange={(v) => setScale(Number(v))}>
              <SelectTrigger id="scale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x (standaard)</SelectItem>
                <SelectItem value="2">2x (hoge kwaliteit)</SelectItem>
                <SelectItem value="3">3x (print kwaliteit)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Hogere schaal = scherpere afbeelding voor print
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Opties</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTitle"
                  checked={includeTitle}
                  onCheckedChange={(checked) => setIncludeTitle(checked === true)}
                />
                <Label htmlFor="includeTitle" className="cursor-pointer">
                  Titel en datum toevoegen
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeLegend"
                  checked={includeLegend}
                  onCheckedChange={(checked) => setIncludeLegend(checked === true)}
                />
                <Label htmlFor="includeLegend" className="cursor-pointer">
                  Legenda toevoegen
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hideGrid"
                  checked={hideGrid}
                  onCheckedChange={(checked) => setHideGrid(checked === true)}
                />
                <Label htmlFor="hideGrid" className="cursor-pointer">
                  Raster verbergen
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporteren...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
