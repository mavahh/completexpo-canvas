import { useCallback, useEffect, useRef, useState } from 'react';
import { useFloorplanData } from './useFloorplanData';
import { useCanvasInteraction } from './useCanvasInteraction';
import { useUndoRedo } from './useUndoRedo';
import { useAutosave } from './useAutosave';
import { useDrawMode, EditorTool } from './useDrawMode';
import { useEditSession } from './useEditSession';
import { useStandPresets, StandPreset, STAND_PRESETS } from './useStandPresets';
import { alignStands, AlignmentType, distributeStands, DistributionType } from './alignmentUtils';
import type { Stand } from '@/types';

interface UseFloorplanEditorProps {
  eventId: string | undefined;
  canEdit: boolean;
  canvasRef: React.RefObject<HTMLDivElement>;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
}

export function useFloorplanEditor({
  eventId,
  canEdit,
  canvasRef,
  canvasContainerRef,
}: UseFloorplanEditorProps) {
  const [performanceMode, setPerformanceMode] = useState(false);

  // Core data hook
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

  // Undo/Redo hook
  const undoRedo = useUndoRedo({
    stands: floorplanData.stands,
    setStands: floorplanData.setStands,
    setDirty: floorplanData.setDirty,
    setSelectedStandIds: floorplanData.setSelectedStandIds,
  });

  // Autosave hook
  const autosave = useAutosave({
    stands: floorplanData.stands,
    dirty: floorplanData.dirty,
    setDirty: floorplanData.setDirty,
    eventId,
    canEdit,
    debounceMs: 800,
  });

  // Draw mode hook
  const drawMode = useDrawMode({
    floorplan: floorplanData.floorplan,
    zoom: canvasInteraction.zoom,
    pan: canvasInteraction.pan,
    snapToGrid: canvasInteraction.snapToGrid,
    onStandCreated: async (x, y, width, height) => {
      await floorplanData.addStandWithSize?.(x, y, width, height);
    },
  });

  // Edit session hook (soft locking)
  const editSession = useEditSession({
    floorplanId: floorplanData.selectedFloorplanId,
    canEdit,
  });

  // Stand presets
  const presetsData = useStandPresets();

  // Trigger autosave when dirty
  useEffect(() => {
    if (floorplanData.dirty && canEdit) {
      autosave.triggerAutosave();
    }
  }, [floorplanData.dirty, canEdit, autosave.triggerAutosave]);

  // Record update for undo/redo
  const updateStandWithUndo = useCallback((id: string, updates: Partial<Stand>) => {
    const oldStand = floorplanData.stands.find(s => s.id === id);
    if (oldStand) {
      const updateMap = new Map<string, { before: Partial<Stand>; after: Partial<Stand> }>();
      updateMap.set(id, { 
        before: { ...oldStand }, 
        after: { ...oldStand, ...updates } 
      });
      undoRedo.recordUpdate(updateMap);
    }
    floorplanData.updateStand(id, updates);
  }, [floorplanData.stands, floorplanData.updateStand, undoRedo.recordUpdate]);

  // Add with preset
  const addWithPreset = useCallback(async (preset: StandPreset) => {
    if (!floorplanData.floorplan || !eventId || !canEdit) return;
    
    await floorplanData.addStandWithSize?.(100, 100, preset.width, preset.height);
  }, [floorplanData.floorplan, floorplanData.addStandWithSize, eventId, canEdit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRedo.undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        undoRedo.redo();
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (floorplanData.selectedStandIds.size > 0 && canEdit) {
          handleDuplicate();
        }
        return;
      }

      // Draw mode: D
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey && canEdit) {
        e.preventDefault();
        drawMode.setActiveTool('draw');
        return;
      }

      // Select mode: V or Escape
      if (e.key === 'v' || e.key === 'Escape') {
        drawMode.setActiveTool('select');
        if (drawMode.isDrawing) {
          drawMode.cancelDraw();
        }
        return;
      }

      // Arrow keys for nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && 
          floorplanData.selectedStandIds.size > 0 && canEdit) {
        e.preventDefault();
        const gridSize = floorplanData.floorplan?.grid_size || 20;
        let step = gridSize;
        
        if (e.shiftKey) {
          step = gridSize * 5; // 5x grid step
        } else if (e.ctrlKey || e.metaKey) {
          step = 1; // Fine mode: 1px
        }

        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        floorplanData.selectedStandIds.forEach(id => {
          const stand = floorplanData.stands.find(s => s.id === id);
          if (stand) {
            updateStandWithUndo(id, { 
              x: Math.max(0, stand.x + dx), 
              y: Math.max(0, stand.y + dy) 
            });
          }
        });
        return;
      }

      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        autosave.saveNow();
        return;
      }

      // Shift for aspect ratio lock in draw mode
      if (e.key === 'Shift') {
        drawMode.setShiftPressed(true);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        drawMode.setShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    undoRedo, 
    drawMode, 
    floorplanData.selectedStandIds, 
    floorplanData.stands,
    floorplanData.floorplan,
    canEdit,
    autosave,
    updateStandWithUndo,
  ]);

  // Duplicate selected stands
  const handleDuplicate = useCallback(async (keepExhibitor = false) => {
    if (!canEdit || floorplanData.selectedStandIds.size === 0) return;

    const offset = floorplanData.floorplan?.grid_size || 20;
    
    // For now we just create copies at offset position
    for (const id of floorplanData.selectedStandIds) {
      const stand = floorplanData.stands.find(s => s.id === id);
      if (stand && floorplanData.floorplan && eventId) {
        await floorplanData.addStandWithSize?.(
          stand.x + offset, 
          stand.y + offset, 
          stand.width, 
          stand.height
        );
      }
    }
  }, [canEdit, floorplanData, eventId]);

  // Alignment handlers
  const handleAlign = useCallback((type: AlignmentType) => {
    if (floorplanData.selectedStandIds.size < 2) return;
    const selectedStands = floorplanData.stands.filter(s => 
      floorplanData.selectedStandIds.has(s.id)
    );
    const updates = alignStands(selectedStands, type);
    updates.forEach(update => {
      updateStandWithUndo(update.id, { x: update.x, y: update.y });
    });
  }, [floorplanData.selectedStandIds, floorplanData.stands, updateStandWithUndo]);

  const handleDistribute = useCallback((type: DistributionType) => {
    if (floorplanData.selectedStandIds.size < 3) return;
    const selectedStands = floorplanData.stands.filter(s => 
      floorplanData.selectedStandIds.has(s.id)
    );
    const updates = distributeStands(selectedStands, type);
    updates.forEach(update => {
      updateStandWithUndo(update.id, { x: update.x, y: update.y });
    });
  }, [floorplanData.selectedStandIds, floorplanData.stands, updateStandWithUndo]);

  return {
    // Floorplan data
    ...floorplanData,
    
    // Canvas interaction
    canvasInteraction,
    
    // Undo/Redo
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    undo: undoRedo.undo,
    redo: undoRedo.redo,
    
    // Autosave
    saveStatus: autosave.saveStatus,
    lastSavedAt: autosave.lastSavedAt,
    saveNow: autosave.saveNow,
    
    // Draw mode
    activeTool: drawMode.activeTool,
    setActiveTool: drawMode.setActiveTool,
    isDrawing: drawMode.isDrawing,
    drawRect: drawMode.drawRect,
    startDraw: drawMode.startDraw,
    updateDraw: drawMode.updateDraw,
    endDraw: drawMode.endDraw,
    cancelDraw: drawMode.cancelDraw,
    
    // Edit session
    otherEditors: editSession.otherEditors,
    hasOtherEditors: editSession.hasOtherEditors,
    otherEditorNames: editSession.otherEditorNames,
    
    // Presets
    presetList: STAND_PRESETS,
    addWithPreset,
    
    // Performance mode
    performanceMode,
    setPerformanceMode,
    
    // Enhanced actions
    updateStandWithUndo,
    handleDuplicate,
    handleAlign,
    handleDistribute,
  };
}
