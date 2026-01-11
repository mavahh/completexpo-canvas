import { Button } from '@/components/ui/button';
import { HallSelector } from './HallSelector';
import { 
  ArrowLeft, 
  ZoomIn, 
  ZoomOut, 
  Grid3X3, 
  Maximize2, 
  Minimize2,
  Download,
  Save,
  Check,
  Loader2,
  RotateCcw,
  Crosshair
} from 'lucide-react';

interface Floorplan {
  id: string;
  event_id: string;
  name: string;
  hall: string | null;
  width: number;
  height: number;
  grid_size: number;
  background_url: string | null;
  background_opacity: number | null;
}

interface FullscreenToolbarProps {
  eventId: string;
  floorplans: Floorplan[];
  selectedFloorplanId: string | null;
  onSelectFloorplan: (id: string) => void;
  onFloorplanAdded: (floorplan: Floorplan) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToScreen: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: () => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  canEdit: boolean;
  onBack: () => void;
}

export function FullscreenToolbar({
  eventId,
  floorplans,
  selectedFloorplanId,
  onSelectFloorplan,
  onFloorplanAdded,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToScreen,
  showGrid,
  onToggleGrid,
  isFullscreen,
  onToggleFullscreen,
  onExport,
  onSave,
  saving,
  dirty,
  canEdit,
  onBack,
}: FullscreenToolbarProps) {
  return (
    <div className={`
      flex items-center justify-between bg-card/95 backdrop-blur-sm border-b border-border p-2 
      ${isFullscreen ? 'fixed top-0 left-0 right-0 z-50 shadow-lg' : ''}
    `}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <HallSelector
          eventId={eventId}
          floorplans={floorplans}
          selectedFloorplanId={selectedFloorplanId}
          onSelect={onSelectFloorplan}
          onFloorplanAdded={onFloorplanAdded}
          disabled={!canEdit}
        />
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomReset} title="Reset zoom (100%)">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitToScreen} title="Fit to screen">
          <Crosshair className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Button
          variant={showGrid ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={onToggleGrid}
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onExport}>
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
        
        {canEdit && (
          <Button size="sm" onClick={onSave} disabled={saving || !dirty}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : dirty ? (
              <Save className="w-4 h-4 mr-1" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            {dirty ? 'Opslaan' : 'Opgeslagen'}
          </Button>
        )}
      </div>
    </div>
  );
}
