import { Button } from '@/components/ui/button';
import { MousePointer2, PenTool, Undo2, Redo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { PerformanceModeToggle } from './PerformanceModeToggle';
import { StandPresetSelector } from './StandPresetSelector';
import { SaveStatus } from '@/hooks/floorplan/useAutosave';
import { EditorTool } from '@/hooks/floorplan/useDrawMode';
import { StandPreset } from '@/hooks/floorplan/useStandPresets';

interface DrawModeToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  performanceMode: boolean;
  onPerformanceModeChange: (enabled: boolean) => void;
  onAddDefault: () => void;
  onAddWithPreset: (preset: StandPreset) => void;
  canEdit: boolean;
}

export function DrawModeToolbar({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveStatus,
  lastSavedAt,
  performanceMode,
  onPerformanceModeChange,
  onAddDefault,
  onAddWithPreset,
  canEdit,
}: DrawModeToolbarProps) {
  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
      {/* Tool toggle */}
      <div className="flex items-center bg-muted rounded-md p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'select' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => onToolChange('select')}
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Select tool (V)</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'draw' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => onToolChange('draw')}
            >
              <PenTool className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Draw stand (D)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Undo (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Redo (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Stand Presets - hidden on smaller screens since main toolbar has add button */}
      <div className="hidden xl:block">
        <StandPresetSelector
          onSelectPreset={onAddWithPreset}
          onAddDefault={onAddDefault}
        />
      </div>

      {/* Performance Mode */}
      <PerformanceModeToggle
        performanceMode={performanceMode}
        onToggle={onPerformanceModeChange}
      />

      {/* Save Status */}
      <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
    </div>
  );
}
