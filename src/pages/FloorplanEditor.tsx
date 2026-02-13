import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, PanelLeft, PanelRight, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEventRole } from '@/hooks/useEventRole';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFloorplanEditor, useFloorplanExport } from '@/hooks/floorplan';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloorplanEditorToolbar } from '@/components/floorplan/FloorplanEditorToolbar';
import { DrawModeToolbar } from '@/components/floorplan/DrawModeToolbar';
import { FloorplanLeftSidebar } from '@/components/floorplan/FloorplanLeftSidebar';
import { FloorplanRightSidebar } from '@/components/floorplan/FloorplanRightSidebar';
import { FloorplanCanvasEnhanced } from '@/components/floorplan/FloorplanCanvasEnhanced';
import { LabelingModalEnhanced } from '@/components/floorplan/LabelingModalEnhanced';
import { ExportDialogEnhanced } from '@/components/floorplan/ExportDialogEnhanced';
import { SaveAsTemplateDialog } from '@/components/floorplan/SaveAsTemplateDialog';
import { EditSessionBanner } from '@/components/floorplan/EditSessionBanner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';

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
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const isMobile = useIsMobile();
  const [hallBackgroundUrl, setHallBackgroundUrl] = useState<string | null>(null);

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

  // Integrated floorplan editor hook with all features
  const editor = useFloorplanEditor({ 
    eventId, 
    canEdit, 
    canvasRef, 
    canvasContainerRef 
  });

  const effectiveBackgroundUrl = editor.floorplan?.background_url || hallBackgroundUrl;

  // Export hook
  const { handleExport } = useFloorplanExport({
    canvasRef,
    floorplan: editor.floorplan,
    eventName: editor.eventName,
    statusCounts: editor.statusCounts,
    showGrid: editor.canvasInteraction.showGrid,
    setShowGrid: editor.canvasInteraction.setShowGrid,
  });

  // Initial data fetch
  useEffect(() => {
    editor.fetchData();
  }, [eventId]);

  // Fetch stands when floorplan changes
  useEffect(() => {
    editor.fetchStands();
  }, [editor.selectedFloorplanId]);

  // Handle canvas mouse events for draw mode
  const handleCanvasMouseDown = (e: React.MouseEvent, standId?: string) => {
    if (editor.activeTool === 'draw' && !standId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (editor.startDraw(e, rect)) {
        return;
      }
    }
    editor.canvasInteraction.handleMouseDown(e, standId);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (editor.isDrawing) {
      editor.updateDraw(e);
    } else {
      editor.canvasInteraction.handleMouseMove(e);
    }
  };

  const handleCanvasMouseUp = () => {
    if (editor.isDrawing) {
      editor.endDraw();
    } else {
      editor.canvasInteraction.handleMouseUp();
    }
  };

  if (editor.loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div 
        ref={editorRef}
        className={`flex flex-col animate-fade-in ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)]'}`}
      >
        {/* Edit session warning banner */}
        {editor.hasOtherEditors && (
          <EditSessionBanner editorNames={editor.otherEditorNames} />
        )}

        {/* Toolbar Row 1: Navigation & View controls */}
        <div className="flex items-center bg-card border-b border-border">
          <FloorplanEditorToolbar
            eventId={eventId || ''}
            floorplans={editor.floorplans}
            floorplan={editor.floorplan}
            selectedFloorplanId={editor.selectedFloorplanId}
            zoom={editor.canvasInteraction.zoom}
            showGrid={editor.canvasInteraction.showGrid}
            isDark={isDark}
            isFullscreen={isFullscreen}
            isReadOnly={isReadOnly}
            canEdit={canEdit}
            saving={editor.saving}
            dirty={editor.dirty}
            warningsCount={editor.warnings.length}
            onNavigateBack={() => navigate(`/events/${eventId}`)}
            onSelectFloorplan={editor.setSelectedFloorplanId}
            onFloorplanAdded={editor.handleFloorplanAdded}
            onZoomIn={() => editor.canvasInteraction.setZoom(Math.min(3, editor.canvasInteraction.zoom + 0.1))}
            onZoomOut={() => editor.canvasInteraction.setZoom(Math.max(0.1, editor.canvasInteraction.zoom - 0.1))}
            onZoomReset={() => { editor.canvasInteraction.setZoom(1); editor.canvasInteraction.setPan({ x: 0, y: 0 }); }}
            onFitToScreen={editor.canvasInteraction.fitToScreen}
            onToggleGrid={() => editor.canvasInteraction.setShowGrid(!editor.canvasInteraction.showGrid)}
            onToggleDarkMode={toggleDarkMode}
            onToggleFullscreen={toggleFullscreen}
            onBackgroundChange={editor.handleBackgroundChange}
            onOpenLabeling={() => setShowLabelingModal(true)}
            onOpenExport={() => setShowExportDialog(true)}
            onOpenTemplate={() => setShowTemplateDialog(true)}
            onAddStand={editor.addStand}
            onSaveAll={editor.saveNow}
            onOpenWarnings={() => setRightPanelTab('warnings')}
          />
        </div>

        {/* Toolbar Row 2: Editor tools (only when canEdit) */}
        {canEdit && (
          <div className="flex items-center justify-between bg-card/80 border-b border-border px-2 py-1.5 gap-2">
            <DrawModeToolbar
              activeTool={editor.activeTool}
              onToolChange={editor.setActiveTool}
              canUndo={editor.canUndo}
              canRedo={editor.canRedo}
              onUndo={editor.undo}
              onRedo={editor.redo}
              saveStatus={editor.saveStatus}
              lastSavedAt={editor.lastSavedAt}
              performanceMode={editor.performanceMode}
              onPerformanceModeChange={editor.setPerformanceMode}
              onAddDefault={editor.addStand}
              onAddWithPreset={editor.addWithPreset}
              canEdit={canEdit}
            />
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5 text-xs"
              onClick={() => navigate(`/editor/${editor.selectedFloorplanId || ''}/${eventId}`)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Pro Editor
            </Button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden relative" ref={canvasContainerRef}>
          {/* Mobile panel toggle buttons */}
          {!isFullscreen && (
            <div className="absolute bottom-4 left-4 z-20 flex gap-2 lg:hidden">
              <Sheet open={mobileLeftOpen} onOpenChange={setMobileLeftOpen}>
                <SheetTrigger asChild>
                  <Button variant="secondary" size="sm" className="shadow-lg md:hidden">
                    <PanelLeft className="w-4 h-4 mr-1" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>Filters & Exposanten</SheetTitle>
                  </SheetHeader>
                  <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
                    <FloorplanLeftSidebar
                      statusFilters={editor.statusFilters}
                      statusCounts={editor.statusCounts}
                      exhibitors={editor.filteredExhibitors}
                      stands={editor.stands}
                      exhibitorSearch={editor.exhibitorSearch}
                      activeExhibitorId={editor.activeExhibitorId}
                      canEdit={canEdit}
                      onFilterChange={(status, checked) => 
                        editor.setStatusFilters(prev => ({ ...prev, [status]: checked }))
                      }
                      onExhibitorSearchChange={editor.setExhibitorSearch}
                      onExhibitorSelect={(id) => {
                        editor.setActiveExhibitorId(id);
                        setMobileLeftOpen(false);
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              
              <Sheet open={mobileRightOpen} onOpenChange={setMobileRightOpen}>
                <SheetTrigger asChild>
                  <Button variant="secondary" size="sm" className="shadow-lg md:hidden">
                    <PanelRight className="w-4 h-4 mr-1" />
                    {editor.selectedStandIds.size > 0 ? `Selectie (${editor.selectedStandIds.size})` : 'Details'}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <FloorplanRightSidebar
                    activeTab={rightPanelTab}
                    onTabChange={setRightPanelTab}
                    selectedStandIds={editor.selectedStandIds}
                    selectedStand={editor.selectedStand}
                    stands={editor.stands}
                    exhibitors={editor.exhibitors}
                    exhibitorServices={editor.exhibitorServices}
                    activeExhibitorId={editor.activeExhibitorId}
                    warnings={editor.warnings}
                    eventId={eventId || ''}
                    selectedFloorplanId={editor.selectedFloorplanId}
                    canEdit={canEdit}
                    onUpdateStand={editor.updateStandWithUndo}
                    onUpdateStandWithAutoStatus={editor.updateStandWithAutoStatus}
                    onDeleteStand={editor.deleteStand}
                    onSelectStand={(id) => editor.setSelectedStandIds(new Set([id]))}
                    onClearSelection={() => editor.setSelectedStandIds(new Set())}
                    onBulkSetStatus={editor.handleBulkSetStatus}
                    onBulkSnapToGrid={editor.handleBulkSnapToGrid}
                    onBulkClearExhibitor={editor.handleBulkClearExhibitor}
                    onBulkRotate={editor.handleBulkRotate}
                    onExportLabels={editor.handleExportLabels}
                    onFixDuplicates={canEdit ? editor.handleFixDuplicates : undefined}
                    onClampToBounds={canEdit ? editor.handleClampToBounds : undefined}
                    getExhibitorName={editor.getExhibitorName}
                  />
                </SheetContent>
              </Sheet>
            </div>
          )}
          
          {/* Left sidebar - hidden on mobile and tablet, shown on desktop */}
          {!isFullscreen && (
            <div className="hidden lg:block">
              <FloorplanLeftSidebar
                statusFilters={editor.statusFilters}
                statusCounts={editor.statusCounts}
                exhibitors={editor.filteredExhibitors}
                stands={editor.stands}
                exhibitorSearch={editor.exhibitorSearch}
                activeExhibitorId={editor.activeExhibitorId}
                canEdit={canEdit}
                onFilterChange={(status, checked) => 
                  editor.setStatusFilters(prev => ({ ...prev, [status]: checked }))
                }
                onExhibitorSearchChange={editor.setExhibitorSearch}
                onExhibitorSelect={editor.setActiveExhibitorId}
              />
            </div>
          )}

          {/* Canvas */}
          <FloorplanCanvasEnhanced
            ref={canvasRef}
            floorplan={editor.floorplan}
            stands={editor.filteredStands}
            selectedStandIds={editor.selectedStandIds}
            exhibitorServices={editor.exhibitorServices}
            zoom={editor.canvasInteraction.zoom}
            pan={editor.canvasInteraction.pan}
            showGrid={editor.canvasInteraction.showGrid}
            isPanning={editor.canvasInteraction.isPanning}
            spacePressed={editor.canvasInteraction.spacePressed}
            canEdit={canEdit}
            statusFilters={editor.statusFilters}
            getExhibitorName={editor.getExhibitorName}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onResizeStart={editor.canvasInteraction.handleResizeStart}
            activeTool={editor.activeTool}
            drawRect={editor.drawRect}
            performanceMode={editor.performanceMode}
            effectiveBackgroundUrl={effectiveBackgroundUrl}
          />

          {/* Right sidebar - hidden on mobile, shown on tablet+ */}
          {!isFullscreen && (
            <div className="hidden md:block">
              <FloorplanRightSidebar
                activeTab={rightPanelTab}
                onTabChange={setRightPanelTab}
                selectedStandIds={editor.selectedStandIds}
                selectedStand={editor.selectedStand}
                stands={editor.stands}
                exhibitors={editor.exhibitors}
                exhibitorServices={editor.exhibitorServices}
                activeExhibitorId={editor.activeExhibitorId}
                warnings={editor.warnings}
                eventId={eventId || ''}
                selectedFloorplanId={editor.selectedFloorplanId}
                canEdit={canEdit}
                onUpdateStand={editor.updateStandWithUndo}
                onUpdateStandWithAutoStatus={editor.updateStandWithAutoStatus}
                onDeleteStand={editor.deleteStand}
                onSelectStand={(id) => editor.setSelectedStandIds(new Set([id]))}
                onClearSelection={() => editor.setSelectedStandIds(new Set())}
                onBulkSetStatus={editor.handleBulkSetStatus}
                onBulkSnapToGrid={editor.handleBulkSnapToGrid}
                onBulkClearExhibitor={editor.handleBulkClearExhibitor}
                onBulkRotate={editor.handleBulkRotate}
                onExportLabels={editor.handleExportLabels}
                onFixDuplicates={canEdit ? editor.handleFixDuplicates : undefined}
                onClampToBounds={canEdit ? editor.handleClampToBounds : undefined}
                getExhibitorName={editor.getExhibitorName}
              />
            </div>
          )}
        </div>

        {/* Modals */}
        <LabelingModalEnhanced
          open={showLabelingModal}
          onClose={() => setShowLabelingModal(false)}
          onApply={editor.handleApplyLabels}
          selectedCount={editor.selectedStandIds.size}
          totalCount={editor.stands.length}
          existingLabels={editor.stands.map(s => s.label)}
        />
        
        <ExportDialogEnhanced
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExport={handleExport}
          eventName={editor.eventName}
          floorplanName={editor.floorplan?.name || 'Floorplan'}
        />

        <SaveAsTemplateDialog
          open={showTemplateDialog}
          onClose={() => setShowTemplateDialog(false)}
          floorplan={editor.floorplan || null}
          stands={editor.stands}
        />
      </div>
    </TooltipProvider>
  );
}
