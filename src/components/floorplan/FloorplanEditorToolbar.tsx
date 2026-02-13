import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Plus, Save, ZoomIn, ZoomOut, Grid3X3, Loader2,
  RotateCcw, Check, Moon, Sun, Lock, Tag, Download, AlertTriangle, 
  Maximize2, Minimize2, Crosshair, Layout, Menu, Focus
} from 'lucide-react';
import { HallSelector } from './HallSelector';
import { BackgroundUpload } from './BackgroundUpload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Floorplan } from '@/types';

interface FloorplanEditorToolbarProps {
  eventId: string;
  floorplans: Floorplan[];
  floorplan: Floorplan | undefined;
  selectedFloorplanId: string | null;
  zoom: number;
  showGrid: boolean;
  isDark: boolean;
  isFullscreen: boolean;
  isReadOnly: boolean;
  canEdit: boolean;
  saving: boolean;
  dirty: boolean;
  warningsCount: number;
  onNavigateBack: () => void;
  onSelectFloorplan: (id: string | null) => void;
  onFloorplanAdded: (floorplan: Floorplan) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToScreen: () => void;
  onToggleGrid: () => void;
  onToggleDarkMode: () => void;
  onToggleFullscreen: () => void;
  onBackgroundChange: (url: string | null, opacity: number) => void;
  onOpenLabeling: () => void;
  onOpenExport: () => void;
  onOpenTemplate: () => void;
  onAddStand: () => void;
  onSaveAll: () => void;
  onOpenWarnings: () => void;
  onFitToBackground?: () => void;
  onResetView?: () => void;
  onCenterView?: () => void;
}

export function FloorplanEditorToolbar({
  eventId,
  floorplans,
  floorplan,
  selectedFloorplanId,
  zoom,
  showGrid,
  isDark,
  isFullscreen,
  isReadOnly,
  canEdit,
  saving,
  dirty,
  warningsCount,
  onNavigateBack,
  onSelectFloorplan,
  onFloorplanAdded,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToScreen,
  onToggleGrid,
  onToggleDarkMode,
  onToggleFullscreen,
  onBackgroundChange,
  onOpenLabeling,
  onOpenExport,
  onOpenTemplate,
  onAddStand,
  onSaveAll,
  onOpenWarnings,
  onFitToBackground,
  onResetView,
  onCenterView,
}: FloorplanEditorToolbarProps) {
  return (
    <div className={`flex items-center justify-between p-2 gap-2 flex-1 min-w-0 ${isFullscreen ? 'px-4' : 'sm:p-3'}`}>
      {/* Left section */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3" onClick={onNavigateBack}>
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Terug</span>
        </Button>
        
        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
        
        <div className="hidden sm:block">
          <HallSelector
            eventId={eventId}
            floorplans={floorplans}
            selectedFloorplanId={selectedFloorplanId}
            onSelect={onSelectFloorplan}
            onFloorplanAdded={onFloorplanAdded}
            disabled={!canEdit}
          />
        </div>
        
        {/* Zoom controls - hidden on mobile, shown on tablet+ */}
        <div className="hidden md:flex items-center gap-1">
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomReset} title="Reset (100%)">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitToScreen} title="Fit to screen">
            <Crosshair className="w-4 h-4" />
          </Button>
          {onFitToBackground && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitToBackground} title="Fit to background">
              <Focus className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Grid and view controls - hidden on mobile */}
        <div className="hidden lg:flex items-center gap-1">
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant={showGrid ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={onToggleGrid}
            title="Toggle grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={onToggleDarkMode}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          
          {floorplan && !isFullscreen && (
            <BackgroundUpload
              floorplanId={floorplan.id}
              currentBackground={floorplan.background_url}
              currentOpacity={floorplan.background_opacity || 100}
              onBackgroundChange={onBackgroundChange}
              disabled={!canEdit}
            />
          )}
          
          <div className="w-px h-5 bg-border mx-1" />
          
          <Button variant="ghost" size="sm" onClick={onOpenLabeling}>
            <Tag className="w-4 h-4" />
            {!isFullscreen && <span className="ml-1">Labels</span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenExport}>
            <Download className="w-4 h-4" />
            {!isFullscreen && <span className="ml-1">Export</span>}
          </Button>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={onOpenTemplate}>
              <Layout className="w-4 h-4" />
              {!isFullscreen && <span className="ml-1">Template</span>}
            </Button>
          )}
        </div>
      </div>
      
      {/* Right section */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Mobile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onZoomIn}>
              <ZoomIn className="w-4 h-4 mr-2" /> Zoom in
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onZoomOut}>
              <ZoomOut className="w-4 h-4 mr-2" /> Zoom out
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFitToScreen}>
              <Crosshair className="w-4 h-4 mr-2" /> Passend maken
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleGrid}>
              <Grid3X3 className="w-4 h-4 mr-2" /> {showGrid ? 'Verberg grid' : 'Toon grid'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleDarkMode}>
              {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
              {isFullscreen ? 'Verlaat fullscreen' : 'Fullscreen'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenLabeling}>
              <Tag className="w-4 h-4 mr-2" /> Labels
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenExport}>
              <Download className="w-4 h-4 mr-2" /> Export
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={onOpenTemplate}>
                <Layout className="w-4 h-4 mr-2" /> Template
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {isReadOnly && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            <Lock className="w-3 h-3" />
            <span className="hidden md:inline">Alleen lezen</span>
          </div>
        )}
        
        {warningsCount > 0 && (
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 text-warning"
            onClick={onOpenWarnings}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="sr-only">{warningsCount} warnings</span>
          </Button>
        )}
        
        {canEdit && (
          <>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3" onClick={onAddStand}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Stand</span>
            </Button>
            <Button size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3" onClick={onSaveAll} disabled={saving || !dirty}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : dirty ? (
                <Save className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ml-1">{dirty ? 'Opslaan' : 'Opgeslagen'}</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
