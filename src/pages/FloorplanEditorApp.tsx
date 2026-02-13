/**
 * FloorplanEditorApp – integrated fullscreen editor for a specific event + hall.
 * Route: /floorplan/event/:eventId/hall/:hallId
 *
 * Single EditorShell: topbar + left panel + canvas + right panel + status bar.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useEditorCamera } from '@/hooks/floorplan-editor/useEditorCamera';
import { useBasemapLoader } from '@/hooks/floorplan-editor/useBasemapLoader';
import { useEditorObjects } from '@/hooks/floorplan-editor/useEditorObjects';
import { useEditorAutosave } from '@/hooks/floorplan-editor/useEditorAutosave';
import { EditorTopbar, type EditorToolType } from '@/components/floorplan-editor/EditorTopbar';
import { EditorCanvas } from '@/components/floorplan-editor/EditorCanvas';
import { EditorLeftPanel } from '@/components/floorplan-editor/EditorLeftPanel';
import { EditorRightPanel } from '@/components/floorplan-editor/EditorRightPanel';
import { EditorStatusBar } from '@/components/floorplan-editor/EditorStatusBar';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { BasemapLayer, WorldPoint } from '@/types/floorplan-editor';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

interface HallOption { id: string; name: string; }
interface Exhibitor { id: string; name: string; }

export default function FloorplanEditorApp() {
  const { eventId, hallId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null!);

  // ---- UI state ----
  const [eventName, setEventName] = useState('');
  const [hallOptions, setHallOptions] = useState<HallOption[]>([]);
  const [selectedHallId, setSelectedHallId] = useState(hallId || '');
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [activeTool, setActiveTool] = useState<EditorToolType>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [layers, setLayers] = useState<BasemapLayer[]>([]);
  const [cursorWorld, setCursorWorld] = useState<WorldPoint | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // ---- Basemap ----
  const { basemap, loading: basemapLoading, error: basemapError } = useBasemapLoader(selectedHallId || null);

  // ---- Camera ----
  const { camera, fit, zoomIn, zoomOut, zoomPercent, pointerHandlers, spacePressed } = useEditorCamera({
    containerRef,
    initialBBox: basemap?.bbox,
  });

  // ---- Objects ----
  const editorObjects = useEditorObjects();

  // ---- Autosave ----
  const { saveStatus, saveNow } = useEditorAutosave({
    eventId,
    hallId: selectedHallId,
    objects: editorObjects.objects,
    version: editorObjects.version,
    dirty: editorObjects.dirty,
    onSaved: editorObjects.markSaved,
  });

  // Grid size from basemap units
  const gridSize = basemap?.units === 'mm' ? 1000 : 1; // 1m grid

  // Sync layers from basemap
  useEffect(() => {
    if (basemap?.layers) setLayers(basemap.layers);
  }, [basemap]);

  // Fit when basemap changes
  useEffect(() => {
    if (basemap?.bbox) fit(basemap.bbox);
  }, [basemap?.hallId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Load event info & halls ----
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data: ev } = await supabase
        .from('events')
        .select('name, hall_id')
        .eq('id', eventId)
        .single();

      if (ev) {
        setEventName(ev.name || '');
        if (!hallId && ev.hall_id) setSelectedHallId(ev.hall_id);

        if (ev.hall_id) {
          const { data: hall } = await supabase.from('halls').select('venue_id').eq('id', ev.hall_id).single();
          if (hall) {
            const { data: halls } = await supabase
              .from('halls').select('id, name')
              .eq('venue_id', hall.venue_id).eq('is_active', true).order('name');
            setHallOptions(halls || []);
          }
        }
      }

      // Load exhibitors for this event
      const { data: exData } = await supabase
        .from('exhibitors').select('id, name')
        .eq('event_id', eventId).order('name');
      setExhibitors(exData || []);
    })();
  }, [eventId, hallId]);

  // ---- Load layout objects ----
  useEffect(() => {
    if (!eventId || !selectedHallId) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('event-layout', {
          method: 'POST',
          body: { method: 'GET', eventId, hallId: selectedHallId },
        });
        if (data?.objects) {
          editorObjects.loadObjects(data.objects, data.version || 0);
        }
      } catch (e) {
        console.error('Failed to load layout:', e);
      }
    })();
  }, [eventId, selectedHallId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Layer toggle ----
  const toggleLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l));
  }, []);

  // ---- Hall switch ----
  const handleHallSwitch = (newHallId: string) => {
    setSelectedHallId(newHallId);
    navigate(`/floorplan/event/${eventId}/hall/${newHallId}`, { replace: true });
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') { setActiveTool('select'); return; }
      if (e.key === 'r' || e.key === 'R') { setActiveTool('draw-rect'); return; }
      if (e.key === 'p' || e.key === 'P') { setActiveTool('draw-poly'); return; }
      if (e.key === 't' || e.key === 'T') { setActiveTool('text'); return; }
      if (e.key === 'm' || e.key === 'M') { setActiveTool('measure'); return; }

      // Undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editorObjects.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); editorObjects.redo(); return; }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault();
        editorObjects.deleteObjects(selectedIds);
        setSelectedIds(new Set());
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setActiveTool('select');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, editorObjects]);

  // ---- Auth check ----
  if (!DEV_MODE && authLoading) {
    return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!DEV_MODE && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-foreground">Je moet inloggen om de editor te gebruiken.</p>
        <Button onClick={() => navigate('/login')}>Inloggen</Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-50 bg-background flex flex-col select-none">
        {/* Topbar */}
        <EditorTopbar
          eventId={eventId || ''}
          eventName={eventName}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          zoomPercent={zoomPercent}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={() => basemap?.bbox && fit(basemap.bbox)}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(g => !g)}
          snapEnabled={snapEnabled}
          onToggleSnap={() => setSnapEnabled(s => !s)}
          hallOptions={hallOptions}
          selectedHallId={selectedHallId}
          onHallSwitch={handleHallSwitch}
          canUndo={editorObjects.canUndo}
          canRedo={editorObjects.canRedo}
          onUndo={editorObjects.undo}
          onRedo={editorObjects.redo}
          saveStatus={saveStatus}
          onSaveNow={saveNow}
        />

        {/* Main area: left panel + canvas + right panel */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel */}
          <EditorLeftPanel
            objects={editorObjects.objects}
            exhibitors={exhibitors}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            collapsed={leftCollapsed}
            onToggleCollapse={() => setLeftCollapsed(c => !c)}
          />

          {/* Canvas */}
          {basemapLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : basemapError ? (
            <div className="flex-1 flex items-center justify-center text-destructive text-sm">
              {basemapError}
            </div>
          ) : (
            <EditorCanvas
              camera={camera}
              basemap={basemap}
              layers={layers}
              objects={editorObjects.objects}
              selectedIds={selectedIds}
              activeTool={activeTool}
              showGrid={showGrid}
              snapEnabled={snapEnabled}
              gridSize={gridSize}
              spacePressed={spacePressed}
              onSelect={setSelectedIds}
              onCreateRectStand={(x, y, w, h) => {
                const stand = editorObjects.createRectStand(x, y, w, h);
                setSelectedIds(new Set([stand.id]));
                setActiveTool('select');
              }}
              onUpdateObject={editorObjects.updateObject}
              onUpdateObjectSilent={editorObjects.updateObjectSilent}
              onCursorMove={setCursorWorld}
              containerRef={containerRef}
              pointerHandlers={pointerHandlers}
            />
          )}

          {/* Right Panel */}
          <EditorRightPanel
            layers={layers}
            onToggleLayer={toggleLayer}
            objects={editorObjects.objects}
            selectedIds={selectedIds}
            exhibitors={exhibitors}
            units={basemap?.units || 'm'}
            onUpdateObject={editorObjects.updateObject}
            collapsed={rightCollapsed}
            onToggleCollapse={() => setRightCollapsed(c => !c)}
          />
        </div>

        {/* Status Bar */}
        <EditorStatusBar
          cursorWorld={cursorWorld}
          units={basemap?.units || 'm'}
          zoomPercent={zoomPercent}
          selectedCount={selectedIds.size}
          objectCount={editorObjects.objects.length}
          saveStatus={saveStatus}
        />
      </div>
    </TooltipProvider>
  );
}
