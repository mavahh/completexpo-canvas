import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, Move, Square } from 'lucide-react';

export interface FloorplanWarning {
  type: 'duplicate' | 'overlap' | 'out-of-bounds';
  standId: string;
  standLabel: string;
  message: string;
}

interface WarningsPanelProps {
  warnings: FloorplanWarning[];
  onSelectStand: (standId: string) => void;
  onFixDuplicates?: () => void;
  onClampToBounds?: () => void;
}

export function WarningsPanel({
  warnings,
  onSelectStand,
  onFixDuplicates,
  onClampToBounds,
}: WarningsPanelProps) {
  const duplicates = warnings.filter((w) => w.type === 'duplicate');
  const overlaps = warnings.filter((w) => w.type === 'overlap');
  const outOfBounds = warnings.filter((w) => w.type === 'out-of-bounds');

  const getIcon = (type: FloorplanWarning['type']) => {
    switch (type) {
      case 'duplicate':
        return <Copy className="w-3 h-3" />;
      case 'overlap':
        return <Square className="w-3 h-3" />;
      case 'out-of-bounds':
        return <Move className="w-3 h-3" />;
    }
  };

  if (warnings.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-sm text-muted-foreground py-4">
          <div className="w-10 h-10 rounded-full bg-success/10 text-success mx-auto mb-2 flex items-center justify-center">
            ✓
          </div>
          Geen waarschuwingen
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Waarschuwingen
          <Badge variant="secondary" className="text-xs">
            {warnings.length}
          </Badge>
        </h4>
      </div>

      <div className="space-y-3">
        {duplicates.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Dubbele labels ({duplicates.length})
              </span>
              {onFixDuplicates && (
                <Button variant="ghost" size="sm" onClick={onFixDuplicates} className="h-6 text-xs">
                  Auto-fix
                </Button>
              )}
            </div>
            {duplicates.slice(0, 5).map((warning, i) => (
              <button
                key={`dup-${i}`}
                onClick={() => onSelectStand(warning.standId)}
                className="w-full flex items-center gap-2 text-left text-xs p-2 rounded hover:bg-muted transition-colors"
              >
                {getIcon(warning.type)}
                <span className="font-medium">{warning.standLabel}</span>
                <span className="text-muted-foreground truncate">{warning.message}</span>
              </button>
            ))}
          </div>
        )}

        {overlaps.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">
              Overlappingen ({overlaps.length})
            </span>
            {overlaps.slice(0, 5).map((warning, i) => (
              <button
                key={`overlap-${i}`}
                onClick={() => onSelectStand(warning.standId)}
                className="w-full flex items-center gap-2 text-left text-xs p-2 rounded hover:bg-muted transition-colors"
              >
                {getIcon(warning.type)}
                <span className="font-medium">{warning.standLabel}</span>
                <span className="text-muted-foreground truncate">{warning.message}</span>
              </button>
            ))}
          </div>
        )}

        {outOfBounds.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Buiten grenzen ({outOfBounds.length})
              </span>
              {onClampToBounds && (
                <Button variant="ghost" size="sm" onClick={onClampToBounds} className="h-6 text-xs">
                  Fix all
                </Button>
              )}
            </div>
            {outOfBounds.slice(0, 5).map((warning, i) => (
              <button
                key={`oob-${i}`}
                onClick={() => onSelectStand(warning.standId)}
                className="w-full flex items-center gap-2 text-left text-xs p-2 rounded hover:bg-muted transition-colors"
              >
                {getIcon(warning.type)}
                <span className="font-medium">{warning.standLabel}</span>
                <span className="text-muted-foreground truncate">{warning.message}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
