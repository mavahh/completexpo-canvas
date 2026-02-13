import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEventRole } from '@/hooks/useEventRole';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFloorplanData, useCanvasInteraction, useFloorplanExport } from '@/hooks/floorplan';
import { useBackgroundBounds } from '@/hooks/floorplan/useBackgroundBounds';
import { FloorplanEditorToolbar } from '@/components/floorplan/FloorplanEditorToolbar';
import { FloorplanRightSidebar } from '@/components/floorplan/FloorplanRightSidebar';
import { FloorplanCanvasEnhanced } from '@/components/floorplan/FloorplanCanvasEnhanced';
import { LabelingModalEnhanced } from '@/components/floorplan/LabelingModalEnhanced';
import { ExportDialogEnhanced } from '@/components/floorplan/ExportDialogEnhanced';
import { SaveAsTemplateDialog } from '@/components/floorplan/SaveAsTemplateDialog';
import { BackgroundDebugPanel } from '@/components/floorplan/BackgroundDebugPanel';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export default function FloorplanFullscreenEditor() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit, isReadOnly, loading: roleLoading } = useEventRole(eventId);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  const { isFullscreen, toggleFullscreen } = useFullscreen(editorRef);
  
  // Modal states
  const [showLabelingModal, setShowLabelingModal] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('properties');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hallBackgroundUrl, setHallBackgroundUrl] = useState<string | null>(null);
  // Floorplan data hook
  const floorplanData = useFloorplanData({ eventId, canEdit });
  
  // Canvas interaction hook
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

  // Compute effective background: floorplan bg > hall bg > null
  const effectiveBackgroundUrl = floorplanData.floorplan?.background_url || hallBackgroundUrl;

  // Background bounds (SVG fit-to-view)
  const bgBounds = useBackgroundBounds({
    backgroundUrl: effectiveBackgroundUrl,
    containerRef: canvasContainerRef,
    setZoom: canvasInteraction.setZoom,
    setPan: canvasInteraction.setPan,
    zoom: canvasInteraction.zoom,
  });

  // Export hook
  const { handleExport } = useFloorplanExport({
    canvasRef,
    floorplan: floorplanData.floorplan,
    eventName: floorplanData.eventName,
    statusCounts: floorplanData.statusCounts,
    showGrid: canvasInteraction.showGrid,
    setShowGrid: canvasInteraction.setShowGrid,
  });

  // Check superadmin + load hall background
  useEffect(() => {
    if (!user) return;
    supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsSuperAdmin(!!data));
  }, [user]);

  // Load hall background for event
  useEffect(() => {
    if (!eventId) return;
    const loadHallBg = async () => {
      const { data: eventData } = await supabase
        .from('events')
        .select('hall_id')
        .eq('id', eventId)
        .single();
      if (eventData?.hall_id) {
        const { data: hallData } = await supabase
          .from('halls')
          .select('background_url')
          .eq('id', eventData.hall_id)
          .single();
        if (hallData?.background_url) {
          setHallBackgroundUrl(hallData.background_url);
        }
      }
    };
    loadHallBg();
  }, [eventId]);

  // Initial data fetch
  useEffect(() => {
    floorplanData.fetchData();
  }, [eventId]);

  // Fetch stands when floorplan changes
  useEffect(() => {
    floorplanData.fetchStands();
  }, [floorplanData.selectedFloorplanId]);

  if (floorplanData.loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div 
      ref={editorRef}
      className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in"
    >
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/events/${eventId}/floorplan`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Terug naar editor</span>
          </button>
          
          <div className="h-4 w-px bg-border" />
          
          <span className="text-sm font-medium text-foreground">
            {floorplanData.eventName}
          </span>
          
          {isReadOnly && (
            <Badge variant="secondary" className="gap-1">
              <Eye className="w-3 h-3" />
              Read-only
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Druk op <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">F</kbd> voor fullscreen
          </span>
        </div>
      </div>

      {/* Main toolbar */}
      <FloorplanEditorToolbar
        eventId={eventId || ''}
        floorplans={floorplanData.floorplans}
        floorplan={floorplanData.floorplan}
        selectedFloorplanId={floorplanData.selectedFloorplanId}
        zoom={canvasInteraction.zoom}
        showGrid={canvasInteraction.showGrid}
        isDark={isDark}
        isFullscreen={isFullscreen}
        isReadOnly={isReadOnly}
        canEdit={canEdit}
        saving={floorplanData.saving}
        dirty={floorplanData.dirty}
        warningsCount={floorplanData.warnings.length}
        onNavigateBack={() => navigate(`/events/${eventId}/floorplan`)}
        onSelectFloorplan={floorplanData.setSelectedFloorplanId}
        onFloorplanAdded={floorplanData.handleFloorplanAdded}
        onZoomIn={() => canvasInteraction.setZoom(Math.min(3, canvasInteraction.zoom + 0.1))}
        onZoomOut={() => canvasInteraction.setZoom(Math.max(0.1, canvasInteraction.zoom - 0.1))}
        onZoomReset={() => { canvasInteraction.setZoom(1); canvasInteraction.setPan({ x: 0, y: 0 }); }}
        onFitToScreen={canvasInteraction.fitToScreen}
        onToggleGrid={() => canvasInteraction.setShowGrid(!canvasInteraction.showGrid)}
        onToggleDarkMode={toggleDarkMode}
        onToggleFullscreen={toggleFullscreen}
        onBackgroundChange={floorplanData.handleBackgroundChange}
        onOpenLabeling={() => setShowLabelingModal(true)}
        onOpenExport={() => setShowExportDialog(true)}
        onOpenTemplate={() => setShowTemplateDialog(true)}
        onAddStand={floorplanData.addStand}
        onSaveAll={floorplanData.saveAll}
        onOpenWarnings={() => setRightPanelTab('warnings')}
        onFitToBackground={bgBounds.fitToBackground}
        onResetView={bgBounds.resetView}
        onCenterView={bgBounds.centerOnBackground}
      />

      <div className="flex flex-1 overflow-hidden relative" ref={canvasContainerRef}>
        {/* Canvas takes maximum space */}
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
          onMouseDown={canvasInteraction.handleMouseDown}
          onMouseMove={canvasInteraction.handleMouseMove}
          onMouseUp={canvasInteraction.handleMouseUp}
           onResizeStart={canvasInteraction.handleResizeStart}
           effectiveBackgroundUrl={effectiveBackgroundUrl}
         />

        {/* Collapsible right sidebar */}
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
            backgroundUrl={effectiveBackgroundUrl}
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

      {/* Modals */}
      <LabelingModalEnhanced
        open={showLabelingModal}
        onClose={() => setShowLabelingModal(false)}
        onApply={floorplanData.handleApplyLabels}
        selectedCount={floorplanData.selectedStandIds.size}
        totalCount={floorplanData.stands.length}
        existingLabels={floorplanData.stands.map(s => s.label)}
      />
      
      <ExportDialogEnhanced
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        eventName={floorplanData.eventName}
        floorplanName={floorplanData.floorplan?.name || 'Floorplan'}
      />

      <SaveAsTemplateDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        floorplan={floorplanData.floorplan || null}
        stands={floorplanData.stands}
      />
    </div>
  );
}
