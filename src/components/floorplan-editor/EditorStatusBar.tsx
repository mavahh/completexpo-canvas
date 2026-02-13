/**
 * EditorStatusBar – bottom bar showing coords, units, selection info, save status.
 */

import type { WorldPoint } from '@/types/floorplan-editor';
import type { SaveStatus } from '@/hooks/floorplan-editor/useEditorAutosave';

interface EditorStatusBarProps {
  cursorWorld: WorldPoint | null;
  units: string;
  zoomPercent: number;
  selectedCount: number;
  objectCount: number;
  saveStatus: SaveStatus;
}

const STATUS_LABELS: Record<SaveStatus, string> = {
  idle: '',
  saving: '💾 Opslaan…',
  saved: '✓ Opgeslagen',
  error: '⚠ Fout bij opslaan',
};

export function EditorStatusBar({
  cursorWorld, units, zoomPercent, selectedCount, objectCount, saveStatus,
}: EditorStatusBarProps) {
  const unitLabel = units === 'mm' ? 'mm' : 'm';

  return (
    <div className="h-6 px-3 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border bg-card shrink-0 select-none">
      {/* Left: coords */}
      <div className="flex items-center gap-3">
        {cursorWorld ? (
          <span>
            X: {cursorWorld.x.toFixed(1)} {unitLabel} &nbsp; Y: {cursorWorld.y.toFixed(1)} {unitLabel}
          </span>
        ) : (
          <span>—</span>
        )}
        <span className="text-border">|</span>
        <span>Eenheid: {unitLabel}</span>
      </div>

      {/* Center: selection */}
      <div>
        {selectedCount > 0 && (
          <span>{selectedCount} geselecteerd</span>
        )}
      </div>

      {/* Right: objects + save */}
      <div className="flex items-center gap-3">
        <span>{objectCount} objecten</span>
        <span className="text-border">|</span>
        <span>Zoom: {zoomPercent}%</span>
        {STATUS_LABELS[saveStatus] && (
          <>
            <span className="text-border">|</span>
            <span>{STATUS_LABELS[saveStatus]}</span>
          </>
        )}
      </div>
    </div>
  );
}
