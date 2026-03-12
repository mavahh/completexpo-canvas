/**
 * EditorTopbar – unified toolbar with tools, zoom, hall navigation, undo/redo.
 */

import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MousePointer2, Square, Pentagon, Type, Ruler,
  Undo2, Redo2, ZoomIn, ZoomOut, Crosshair, Grid3X3, Magnet,
  Maximize, Save, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { HALL_BOUNDS, HALL_NAMES } from '@/config/hallBounds';
import type { SaveStatus } from '@/hooks/floorplan-editor/useEditorAutosave';
import type { BBox } from '@/types/floorplan-editor';

export type EditorToolType = 'select' | 'draw-rect' | 'draw-poly' | 'text' | 'measure';

interface HallOption {
  id: string;
  name: string;
}

interface EditorTopbarProps {
  eventId: string;
  eventName: string;
  activeTool: EditorToolType;
  onToolChange: (tool: EditorToolType) => void;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onFitToBounds: (bbox: BBox) => void;
  /** Called when user selects a hall zone (name) or null for "Volledig plan" */
  onHallZoneSelect: (zoneName: string | null, bbox: BBox) => void;
  activeHallZone: string | null;
  showGrid: boolean;
  onToggleGrid: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  hallOptions: HallOption[];
  selectedHallId: string;
  onHallSwitch: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: SaveStatus;
  onSaveNow: () => void;
  basemapBBox?: BBox | null;
}

const TOOLS: { id: EditorToolType; icon: typeof MousePointer2; label: string; shortcut?: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Selecteren', shortcut: 'V' },
  { id: 'draw-rect', icon: Square, label: 'Rechthoek tekenen', shortcut: 'R' },
  { id: 'draw-poly', icon: Pentagon, label: 'Polygoon tekenen', shortcut: 'P' },
  { id: 'text', icon: Type, label: 'Tekst', shortcut: 'T' },
  { id: 'measure', icon: Ruler, label: 'Meten', shortcut: 'M' },
];

const SAVE_LABELS: Record<SaveStatus, { text: string; className: string }> = {
  idle: { text: '', className: '' },
  saving: { text: 'Opslaan…', className: 'text-muted-foreground' },
  saved: { text: 'Opgeslagen', className: 'text-green-500' },
  error: { text: 'Fout bij opslaan', className: 'text-destructive' },
};

export function EditorTopbar({
  eventId, eventName, activeTool, onToolChange,
  zoomPercent, onZoomIn, onZoomOut, onFit, onFitToBounds,
  showGrid, onToggleGrid, snapEnabled, onToggleSnap,
  hallOptions, selectedHallId, onHallSwitch,
  canUndo, canRedo, onUndo, onRedo,
  saveStatus, onSaveNow,
}: EditorTopbarProps) {
  const navigate = useNavigate();
  const saveInfo = SAVE_LABELS[saveStatus];

  return (
    <div className="flex flex-col border-b border-border bg-card shrink-0">
      {/* Row 1: Tools + Undo/Redo */}
      <div className="flex items-center h-10 px-2 gap-1">
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onClick={() => navigate(`/events/${eventId}`)}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Menu</span>
        </Button>
        <Separator orientation="vertical" className="h-5" />

        {/* Tools */}
        {TOOLS.map(tool => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === tool.id ? 'secondary' : 'ghost'}
                size="icon"
                className={cn('h-7 w-7', activeTool === tool.id && 'bg-primary/10 text-primary')}
                onClick={() => onToolChange(tool.id)}
              >
                <tool.icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tool.label}{tool.shortcut ? ` (${tool.shortcut})` : ''}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canUndo} onClick={onUndo}>
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Ongedaan maken (Ctrl+Z)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canRedo} onClick={onRedo}>
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Opnieuw (Ctrl+Shift+Z)</p></TooltipContent>
        </Tooltip>

        {/* Spacer + event name */}
        <div className="flex-1 flex justify-center">
          <span className="text-xs font-medium text-foreground truncate max-w-[300px]">{eventName}</span>
        </div>

        {/* Save status */}
        {saveInfo.text && (
          <span className={cn('text-xs mr-2', saveInfo.className)}>{saveInfo.text}</span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSaveNow}>
              <Save className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Nu opslaan</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Row 2: Zoom + Grid + Snap + Hall */}
      <div className="flex items-center h-8 px-2 gap-1 border-t border-border/50 bg-muted/30">
        {/* Zoom */}
        <div className="flex items-center bg-background rounded px-1 gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomOut}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-mono w-10 text-center select-none">{zoomPercent}%</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomIn}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onFit}>
              <Crosshair className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Fit (0)</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4" />

        {/* Hall zone navigation */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hallen</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Navigeer naar hal</p></TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            {HALL_NAMES.map(name => (
              <DropdownMenuItem key={name} onClick={() => onFitToBounds(HALL_BOUNDS[name])}>
                {name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showGrid ? 'secondary' : 'ghost'}
              size="icon"
              className="h-6 w-6"
              onClick={onToggleGrid}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Raster {showGrid ? 'uit' : 'aan'}</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={snapEnabled ? 'secondary' : 'ghost'}
              size="icon"
              className="h-6 w-6"
              onClick={onToggleSnap}
            >
              <Magnet className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Snap {snapEnabled ? 'uit' : 'aan'}</p></TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {/* Hall dropdown */}
        {hallOptions.length > 0 && (
          <Select value={selectedHallId} onValueChange={onHallSwitch}>
            <SelectTrigger className="h-6 w-[150px] text-xs">
              <SelectValue placeholder="Hal selecteren…" />
            </SelectTrigger>
            <SelectContent>
              {hallOptions.map(h => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => document.documentElement.requestFullscreen?.()}>
              <Maximize className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Volledig scherm</p></TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
