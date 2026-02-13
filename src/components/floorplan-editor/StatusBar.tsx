/**
 * StatusBar – shows zoom %, world units, and cursor position.
 */

import type { WorldUnit } from '@/types/floorplan-editor';

interface StatusBarProps {
  zoomPercent: number;
  units: WorldUnit;
  cursorWorld?: { x: number; y: number } | null;
}

export function StatusBar({ zoomPercent, units, cursorWorld }: StatusBarProps) {
  const unitLabel = units === 'm' ? 'm' : 'mm';

  return (
    <div className="h-6 flex items-center gap-4 px-3 border-t border-border bg-card text-[11px] text-muted-foreground font-mono select-none">
      <span>Zoom: <strong className="text-foreground">{zoomPercent}%</strong></span>
      <span>Eenheden: <strong className="text-foreground">{unitLabel}</strong></span>
      {cursorWorld && (
        <span>
          X: <strong className="text-foreground">{cursorWorld.x.toFixed(2)}</strong>{unitLabel}
          {' '}
          Y: <strong className="text-foreground">{cursorWorld.y.toFixed(2)}</strong>{unitLabel}
        </span>
      )}
    </div>
  );
}
