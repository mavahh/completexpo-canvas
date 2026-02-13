import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Maximize, Minimize, Grid3X3, Magnet, Save, Download, Eye, Crosshair, RotateCcw, Focus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEventRole } from '@/hooks/useEventRole';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFloorplanData, useCanvasInteraction, useFloorplanExport, useUndoRedo, useAutosave } from '@/hooks/floorplan';
import { useDrawMode } from '@/hooks/floorplan/useDrawMode';
import { useBackgroundBounds } from '@/hooks/floorplan/useBackgroundBounds';
import { FloorplanCanvasEnhanced } from '@/components/floorplan/FloorplanCanvasEnhanced';
import { FloorplanRightSidebar } from '@/components/floorplan/FloorplanRightSidebar';
import { ExportDialogEnhanced } from '@/components/floorplan/ExportDialogEnhanced';
import { EditorLayersPanel } from '@/components/editor/EditorLayersPanel';
import { MeasurementToolButton, MeasurementOverlay, useMeasurementTool } from '@/components/editor/MeasurementTool';
import { BackgroundDebugPanel } from '@/components/floorplan/BackgroundDebugPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { Stand } from '@/types';

interface HallInfo {
  id: string;
  name: string;
  width_meters: number;
  height_meters: number;
  scale_ratio: number;
  background_url: string | null;
  background_type: string | null;
}

export default function ProfessionalEditor() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit, isReadOnly, loading: roleLoading } = useEventRole(eventId);

  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(editorRef);

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('properties');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [eventHalls, setEventHalls] = useState<HallInfo[]>([]);
  const [selectedHallId, setSelectedHallId] = useState<string | null>(null);
  const [scaleRatio, setScaleRatio] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(100);

  // Core hooks
  const floorplanData = useFloorplanData({ eventId, canEdit });

  const canvasInteraction = useCanvasInteraction({
    floorplan: floorplanData.floorplan,
    stands: floorplanData.stands,
    selectedStandIds: floorplanData.selectedStandIds,
    canEdit,
    canvasRef,
    canvasContainerRef,
    setSelectedStandIds: floorplanData.setSelectedStandIds,
    updateStand: floorplanData.updateStand,
    deleteStand: floorplanData.deleteStand,
  });

  // Background bounds (SVG fit-to-view)
  const bgBounds = useBackgroundBounds({
    backgroundUrl: floorplanData.floorplan?.background_url,
    containerRef: canvasContainerRef,
    setZoom: canvasInteraction.setZoom,
    setPan: canvasInteraction.setPan,
    zoom: canvasInteraction.zoom,
  });

  const undoRedo = useUndoRedo({
    stands: floorplanData.stands,
    setStands: floorplanData.setStands,
    setDirty: floorplanData.setDirty,
    setSelectedStandIds: floorplanData.setSelectedStandIds,
  });

  const autosave = useAutosave({
    stands: floorplanData.stands,
    dirty: floorplanData.dirty,
    setDirty: floorplanData.setDirty,
    eventId,
    canEdit,
    debounceMs: 800,
  });

  const drawMode = useDrawMode({
    floorplan: floorplanData.floorplan,
    zoom: canvasInteraction.zoom,
    pan: canvasInteraction.pan,
    snapToGrid: canvasInteraction.snapToGrid,
    onStandCreated: async (x, y, w, h) => {
      await floorplanData.addStandWithSize?.(x, y, w, h);
    },
  });

  const measurement = useMeasurementTool(scaleRatio);

  const { handleExport } = useFloorplanExport({
    canvasRef,
    floorplan: floorplanData.floorplan,
    eventName: floorplanData.eventName,
    statusCounts: floorplanData.statusCounts,
    showGrid: canvasInteraction.showGrid,
    setShowGrid: canvasInteraction.setShowGrid,
  });

  // Check superadmin
  useEffect(() => {
    if (!user) return;
    supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsSuperAdmin(!!data));
  }, [user]);

  // Fetch event + halls
  useEffect(() => {
    if (!eventId) return;
    const fetchEventHalls = async () => {
      const { data: eventData } = await supabase
        .from('events')
        .select('hall_id')
        .eq('id', eventId)
        .single();

      if (eventData?.hall_id) {
        const { data: hallData } = await supabase
          .from('halls')
          .select('id, name, width_meters, height_meters, scale_ratio, background_url, background_type, venue_id')
          .eq('id', eventData.hall_id)
          .single();

        if (hallData) {
          setSelectedHallId(hallData.id);
          setScaleRatio(Number(hallData.scale_ratio) || 1);

          const { data: siblingHalls } = await supabase
            .from('halls')
            .select('id, name, width_meters, height_meters, scale_ratio, background_url, background_type')
            .eq('venue_id', (hallData as any).venue_id)
            .eq('is_active', true)
            .order('name');

          setEventHalls((siblingHalls || []) as HallInfo[]);
        }
      }
    };
    fetchEventHalls();
  }, [eventId]);

  // Fetch floorplan data
  useEffect(() => { floorplanData.fetchData(); }, [eventId]);
  useEffect(() => { floorplanData.fetchStands(); }, [floorplanData.selectedFloorplanId]);

  // Sync bg opacity from floorplan
  useEffect(() => {
    if (floorplanData.floorplan) {
      setBgOpacity(floorplanData.floorplan.background_opacity || 100);
    }
  }, [floorplanData.floorplan?.background_opacity]);

  // Autosave trigger
  useEffect(() => {
    if (floorplanData.dirty && canEdit) autosave.triggerAutosave();
  }, [floorplanData.dirty, canEdit]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRedo.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); undoRedo.redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); autosave.saveNow(); return; }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
      if (e.key === 'm' || e.key === 'M') { measurement.toggle(); return; }
      if (e.key === 'v' || e.key === 'Escape') { drawMode.setActiveTool('select'); return; }
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey && canEdit) { e.preventDefault(); drawMode.setActiveTool('draw'); return; }

      // Arrow nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && floorplanData.selectedStandIds.size > 0 && canEdit) {
        e.preventDefault();
        const step = e.shiftKey ? 50 : (e.ctrlKey ? 1 : (floorplanData.floorplan?.grid_size || 20));
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        floorplanData.selectedStandIds.forEach(id => {
          const s = floorplanData.stands.find(x => x.id === id);
          if (s) floorplanData.updateStand(id, { x: Math.max(0, s.x + dx), y: Math.max(0, s.y + dy) });
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoRedo, drawMode, floorplanData, canEdit, autosave, measurement, toggleFullscreen]);

  // Canvas mouse handlers with draw + measurement
  const handleMouseDown = (e: React.MouseEvent, standId?: string) => {
    if (measurement.active && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvasInteraction.pan.x) / canvasInteraction.zoom;
      const y = (e.clientY - rect.top - canvasInteraction.pan.y) / canvasInteraction.zoom;
      if (measurement.startMeasure(x, y)) return;
    }
    if (drawMode.activeTool === 'draw' && !standId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (drawMode.startDraw(e, rect)) return;
    }
    canvasInteraction.handleMouseDown(e, standId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (measurement.measuring && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvasInteraction.pan.x) / canvasInteraction.zoom;
      const y = (e.clientY - rect.top - canvasInteraction.pan.y) / canvasInteraction.zoom;
      measurement.updateMeasure(x, y);
      return;
    }
    if (drawMode.isDrawing) { drawMode.updateDraw(e); return; }
    canvasInteraction.handleMouseMove(e);
  };

  const handleMouseUp = () => {
    if (measurement.measuring) { measurement.endMeasure(); return; }
    if (drawMode.isDrawing) { drawMode.endDraw(); return; }
    canvasInteraction.handleMouseUp();
  };

  const handleBgOpacityChange = (value: number[]) => {
    const opacity = value[0];
    setBgOpacity(opacity);
    if (floorplanData.floorplan) {
      floorplanData.handleBackgroundChange(floorplanData.floorplan.background_url || null, opacity);
    }
  };

  const zoomPercent = Math.round(canvasInteraction.zoom * 100);

  if (floorplanData.loading || roleLoading) {
    return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <TooltipProvider>
      <div ref={editorRef} className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Minimal CAD Toolbar */}
        <div className="flex items-center justify-between h-10 px-3 border-b border-border bg-card">
          {/* Left: Back */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => navigate(`/events/${eventId}`)}>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Terug naar event</span>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{floorplanData.eventName}</span>
            {isReadOnly && <Badge variant="secondary" className="text-[10px] h-5 gap-1"><Eye className="w-3 h-3" />Read-only</Badge>}
          </div>

          {/* Center: Tools */}
          <div className="flex items-center gap-1">
            {/* Zoom */}
            <div className="flex items-center bg-muted rounded-md px-1.5 py-0.5 gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-xs" onClick={() => canvasInteraction.setZoom(Math.max(0.1, canvasInteraction.zoom - 0.1))}>−</Button>
              <span className="text-xs font-mono w-10 text-center">{zoomPercent}%</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-xs" onClick={() => canvasInteraction.setZoom(Math.min(5, canvasInteraction.zoom + 0.1))}>+</Button>
            </div>

            {/* Fit / Reset / Center */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={bgBounds.fitToBackground}>
                  <Crosshair className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Fit to background</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={bgBounds.resetView}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Reset view</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={bgBounds.centerOnBackground}>
                  <Focus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Center</p></TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Grid */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={canvasInteraction.showGrid ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => canvasInteraction.setShowGrid(!canvasInteraction.showGrid)}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Grid (G)</p></TooltipContent>
            </Tooltip>

            {/* Snap */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={snapEnabled ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSnapEnabled(!snapEnabled)}
                >
                  <Magnet className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Snap (S)</p></TooltipContent>
            </Tooltip>

            {/* Measurement */}
            <MeasurementToolButton active={measurement.active} onToggle={measurement.toggle} />

            {/* Background opacity slider */}
            {floorplanData.floorplan?.background_url && (
              <>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">BG</span>
                  <Slider
                    value={[bgOpacity]}
                    min={0}
                    max={100}
                    step={5}
                    className="w-16"
                    onValueChange={handleBgOpacityChange}
                  />
                  <span className="text-[10px] text-muted-foreground w-6">{bgOpacity}%</span>
                </div>
              </>
            )}

            {/* Hall switch */}
            {eventHalls.length > 1 && (
              <>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Select value={selectedHallId || ''} onValueChange={setSelectedHallId}>
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue placeholder="Hal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eventHalls.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowExportDialog(true)}>
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Exporteren</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={autosave.saveNow} disabled={!floorplanData.dirty}>
                  <Save className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Opslaan (⌘S)</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Fullscreen (F)</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Background loading state */}
        {bgBounds.loading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border-b border-border text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Background loading…
          </div>
        )}
        {bgBounds.error && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
            <span>⚠ {bgBounds.error}</span>
            <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={bgBounds.fitToBackground}>Try fit</Button>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden relative" ref={canvasContainerRef}>
          {/* Layers panel */}
          {showLayers && (
            <div className="w-48 border-r border-border bg-card p-2 overflow-y-auto">
              <EditorLayersPanel />
            </div>
          )}

          {/* Canvas */}
          <FloorplanCanvasEnhanced
            ref={canvasRef}
            floorplan={floorplanData.floorplan}
            stands={floorplanData.filteredStands}
            selectedStandIds={floorplanData.selectedStandIds}
            exhibitorServices={floorplanData.exhibitorServices}
            zoom={canvasInteraction.zoom}
            pan={canvasInteraction.pan}
            showGrid={canvasInteraction.showGrid}
            isPanning={canvasInteraction.isPanning}
            spacePressed={canvasInteraction.spacePressed}
            canEdit={canEdit}
            statusFilters={floorplanData.statusFilters}
            getExhibitorName={floorplanData.getExhibitorName}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onResizeStart={canvasInteraction.handleResizeStart}
            activeTool={drawMode.activeTool}
            drawRect={drawMode.drawRect}
            performanceMode={false}
          />

          {/* Right sidebar */}
          {showRightPanel && (
            <FloorplanRightSidebar
              activeTab={rightPanelTab}
              onTabChange={setRightPanelTab}
              selectedStandIds={floorplanData.selectedStandIds}
              selectedStand={floorplanData.selectedStand}
              stands={floorplanData.stands}
              exhibitors={floorplanData.exhibitors}
              exhibitorServices={floorplanData.exhibitorServices}
              activeExhibitorId={floorplanData.activeExhibitorId}
              warnings={floorplanData.warnings}
              eventId={eventId || ''}
              selectedFloorplanId={floorplanData.selectedFloorplanId}
              canEdit={canEdit}
              onUpdateStand={floorplanData.updateStand}
              onUpdateStandWithAutoStatus={floorplanData.updateStandWithAutoStatus}
              onDeleteStand={floorplanData.deleteStand}
              onSelectStand={(id) => floorplanData.setSelectedStandIds(new Set([id]))}
              onClearSelection={() => floorplanData.setSelectedStandIds(new Set())}
              onBulkSetStatus={floorplanData.handleBulkSetStatus}
              onBulkSnapToGrid={floorplanData.handleBulkSnapToGrid}
              onBulkClearExhibitor={floorplanData.handleBulkClearExhibitor}
              onBulkRotate={floorplanData.handleBulkRotate}
              onExportLabels={floorplanData.handleExportLabels}
              onFixDuplicates={canEdit ? floorplanData.handleFixDuplicates : undefined}
              onClampToBounds={canEdit ? floorplanData.handleClampToBounds : undefined}
              getExhibitorName={floorplanData.getExhibitorName}
            />
          )}

          {/* Debug panel - superadmin only */}
          {isSuperAdmin && (
            <BackgroundDebugPanel
              backgroundUrl={floorplanData.floorplan?.background_url}
              svgViewBox={bgBounds.svgViewBox}
              computedBounds={bgBounds.bounds}
              viewportSize={bgBounds.getViewportSize()}
              cameraPan={canvasInteraction.pan}
              cameraZoom={canvasInteraction.zoom}
              onFitBackground={bgBounds.fitToBackground}
              onSetEmergencyZoom={bgBounds.setEmergencyZoom}
              onCenter={bgBounds.centerOnBackground}
              onLogSvg={bgBounds.logSvgHtml}
            />
          )}
        </div>

        {/* Export dialog */}
        <ExportDialogEnhanced
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExport={handleExport}
          eventName={floorplanData.eventName}
          floorplanName={floorplanData.floorplan?.name || 'Floorplan'}
        />
      </div>
    </TooltipProvider>
  );
}
