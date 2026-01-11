import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Copy, 
  Crosshair, 
  Layers, 
  CheckCircle2,
  Wrench
} from 'lucide-react';

export interface FloorplanWarning {
  type: 'duplicate' | 'overlap' | 'out-of-bounds' | 'missing-label' | 'no-status';
  standId: string;
  standLabel: string;
  message: string;
  relatedStandId?: string;
}

interface WarningsPanelEnhancedProps {
  warnings: FloorplanWarning[];
  onSelectStand: (id: string) => void;
  onFixDuplicates?: () => void;
  onClampToBounds?: () => void;
  onHighlightOverlaps?: (ids: string[]) => void;
}

export function WarningsPanelEnhanced({
  warnings,
  onSelectStand,
  onFixDuplicates,
  onClampToBounds,
  onHighlightOverlaps,
}: WarningsPanelEnhancedProps) {
  const duplicates = warnings.filter(w => w.type === 'duplicate');
  const overlaps = warnings.filter(w => w.type === 'overlap');
  const outOfBounds = warnings.filter(w => w.type === 'out-of-bounds');
  const missingLabels = warnings.filter(w => w.type === 'missing-label');

  const getIcon = (type: FloorplanWarning['type']) => {
    switch (type) {
      case 'duplicate':
        return <Copy className="w-3 h-3" />;
      case 'overlap':
        return <Layers className="w-3 h-3" />;
      case 'out-of-bounds':
        return <Crosshair className="w-3 h-3" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getBadgeVariant = (type: FloorplanWarning['type']) => {
    switch (type) {
      case 'duplicate':
        return 'destructive';
      case 'overlap':
        return 'default';
      case 'out-of-bounds':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (warnings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CheckCircle2 className="w-10 h-10 text-success mb-3" />
          <p className="text-sm font-medium text-foreground">Geen waarschuwingen</p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Alle stands zijn correct geconfigureerd
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Waarschuwingen ({warnings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duplicates section */}
        {duplicates.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs gap-1">
                  <Copy className="w-3 h-3" />
                  Duplicaten ({duplicates.length})
                </Badge>
              </div>
              {onFixDuplicates && (
                <Button variant="outline" size="sm" onClick={onFixDuplicates} className="h-7 text-xs">
                  <Wrench className="w-3 h-3 mr-1" />
                  Auto-fix
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {duplicates.slice(0, 5).map((warning, idx) => (
                  <button
                    key={`dup-${idx}`}
                    onClick={() => onSelectStand(warning.standId)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                  >
                    <span className="font-mono font-medium">{warning.standLabel}</span>
                    <span className="text-muted-foreground ml-2">{warning.message}</span>
                  </button>
                ))}
                {duplicates.length > 5 && (
                  <p className="text-xs text-muted-foreground px-2">
                    +{duplicates.length - 5} meer...
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Overlaps section */}
        {overlaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs gap-1">
                <Layers className="w-3 h-3" />
                Overlappingen ({overlaps.length})
              </Badge>
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {overlaps.slice(0, 5).map((warning, idx) => (
                  <button
                    key={`ovl-${idx}`}
                    onClick={() => onSelectStand(warning.standId)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                  >
                    <span className="font-mono font-medium">{warning.standLabel}</span>
                    <span className="text-muted-foreground ml-2">{warning.message}</span>
                  </button>
                ))}
                {overlaps.length > 5 && (
                  <p className="text-xs text-muted-foreground px-2">
                    +{overlaps.length - 5} meer...
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Out of bounds section */}
        {outOfBounds.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Crosshair className="w-3 h-3" />
                  Buiten grenzen ({outOfBounds.length})
                </Badge>
              </div>
              {onClampToBounds && (
                <Button variant="outline" size="sm" onClick={onClampToBounds} className="h-7 text-xs">
                  <Wrench className="w-3 h-3 mr-1" />
                  Fix all
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {outOfBounds.slice(0, 5).map((warning, idx) => (
                  <button
                    key={`oob-${idx}`}
                    onClick={() => onSelectStand(warning.standId)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                  >
                    <span className="font-mono font-medium">{warning.standLabel}</span>
                    <span className="text-muted-foreground ml-2">{warning.message}</span>
                  </button>
                ))}
                {outOfBounds.length > 5 && (
                  <p className="text-xs text-muted-foreground px-2">
                    +{outOfBounds.length - 5} meer...
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Missing labels section */}
        {missingLabels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" />
                Ontbrekende labels ({missingLabels.length})
              </Badge>
            </div>
            <ScrollArea className="max-h-24">
              <div className="space-y-1">
                {missingLabels.slice(0, 3).map((warning, idx) => (
                  <button
                    key={`ml-${idx}`}
                    onClick={() => onSelectStand(warning.standId)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                  >
                    <span className="text-muted-foreground">{warning.message}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
