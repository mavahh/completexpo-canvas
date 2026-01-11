import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEventRole } from '@/hooks/useEventRole';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFloorplanData, useCanvasInteraction, useFloorplanExport } from '@/hooks/floorplan';
import { FloorplanEditorToolbar } from '@/components/floorplan/FloorplanEditorToolbar';
import { FloorplanLeftSidebar } from '@/components/floorplan/FloorplanLeftSidebar';
import { FloorplanRightSidebar } from '@/components/floorplan/FloorplanRightSidebar';
import { FloorplanCanvasEnhanced } from '@/components/floorplan/FloorplanCanvasEnhanced';
import { LabelingModalEnhanced } from '@/components/floorplan/LabelingModalEnhanced';
import { ExportDialogEnhanced } from '@/components/floorplan/ExportDialogEnhanced';
import { SaveAsTemplateDialog } from '@/components/floorplan/SaveAsTemplateDialog';

export default function FloorplanEditor() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
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

  // Export hook
  const { handleExport } = useFloorplanExport({
    canvasRef,
    floorplan: floorplanData.floorplan,
    eventName: floorplanData.eventName,
    statusCounts: floorplanData.statusCounts,
    showGrid: canvasInteraction.showGrid,
    setShowGrid: canvasInteraction.setShowGrid,
  });

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
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div 
      ref={editorRef}
      className={`flex flex-col animate-fade-in ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)]'}`}
    >
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
        onNavigateBack={() => navigate(`/events/${eventId}`)}
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
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - hidden on mobile and tablet, shown on desktop */}
        {!isFullscreen && (
          <div className="hidden lg:block">
          <FloorplanLeftSidebar
            statusFilters={floorplanData.statusFilters}
            statusCounts={floorplanData.statusCounts}
            exhibitors={floorplanData.filteredExhibitors}
            stands={floorplanData.stands}
            exhibitorSearch={floorplanData.exhibitorSearch}
            activeExhibitorId={floorplanData.activeExhibitorId}
            canEdit={canEdit}
            onFilterChange={(status, checked) => 
              floorplanData.setStatusFilters(prev => ({ ...prev, [status]: checked }))
            }
            onExhibitorSearchChange={floorplanData.setExhibitorSearch}
            onExhibitorSelect={floorplanData.setActiveExhibitorId}
          />
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
          onMouseDown={canvasInteraction.handleMouseDown}
          onMouseMove={canvasInteraction.handleMouseMove}
          onMouseUp={canvasInteraction.handleMouseUp}
          onResizeStart={canvasInteraction.handleResizeStart}
        />

        {/* Right sidebar - hidden on mobile, shown on tablet+ */}
        {!isFullscreen && (
          <div className="hidden md:block">
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
          </div>
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
