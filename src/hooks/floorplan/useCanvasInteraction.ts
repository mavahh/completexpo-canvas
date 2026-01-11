import { useState, useCallback, useEffect, RefObject } from 'react';
import type { Stand, Floorplan } from '@/types';

interface UseCanvasInteractionProps {
  floorplan: Floorplan | undefined;
  stands: Stand[];
  selectedStandIds: Set<string>;
  canEdit: boolean;
  canvasRef: RefObject<HTMLDivElement>;
  canvasContainerRef: RefObject<HTMLDivElement>;
  setSelectedStandIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  updateStand: (id: string, updates: Partial<Stand>) => void;
  deleteStand: () => Promise<void>;
}

export function useCanvasInteraction({
  floorplan,
  stands,
  selectedStandIds,
  canEdit,
  canvasRef,
  canvasContainerRef,
  setSelectedStandIds,
  updateStand,
  deleteStand,
}: UseCanvasInteractionProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<{ id: string; handle: string } | null>(null);
  const [resizeStart, setResizeStart] = useState({ 
    x: 0, y: 0, width: 0, height: 0, standX: 0, standY: 0 
  });
  const [spacePressed, setSpacePressed] = useState(false);

  const snapToGrid = useCallback((value: number) => {
    if (!floorplan || !snapToGridEnabled) return value;
    return Math.round(value / floorplan.grid_size) * floorplan.grid_size;
  }, [floorplan, snapToGridEnabled]);

  const fitToScreen = useCallback(() => {
    if (!floorplan || !canvasContainerRef.current) return;
    
    const container = canvasContainerRef.current;
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    
    const scaleX = containerWidth / floorplan.width;
    const scaleY = containerHeight / floorplan.height;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    setZoom(newZoom);
    setPan({
      x: (containerWidth - floorplan.width * newZoom) / 2,
      y: (containerHeight - floorplan.height * newZoom) / 2,
    });
  }, [floorplan, canvasContainerRef]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
      if (e.code === 'Escape') {
        setSelectedStandIds(new Set());
      }
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedStandIds.size > 0 && canEdit) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteStand();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedStandIds, canEdit, setSelectedStandIds, deleteStand]);

  // Mouse wheel zoom
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [canvasContainerRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent, standId?: string) => {
    if (standId && !spacePressed) {
      e.stopPropagation();
      const stand = stands.find((s) => s.id === standId);
      if (!stand) return;

      if (e.shiftKey) {
        setSelectedStandIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(standId)) {
            newSet.delete(standId);
          } else {
            newSet.add(standId);
          }
          return newSet;
        });
      } else {
        setSelectedStandIds(new Set([standId]));
      }
      
      if (canEdit && !e.shiftKey) {
        setDragging(standId);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: (e.clientX - rect.left) / zoom - stand.x,
            y: (e.clientY - rect.top) / zoom - stand.y,
          });
        }
      }
    } else if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg') || spacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      if (!e.shiftKey && !spacePressed) {
        setSelectedStandIds(new Set());
      }
    }
  }, [stands, spacePressed, canEdit, zoom, pan, canvasRef, setSelectedStandIds]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (dragging && canEdit && !spacePressed) {
      const stand = stands.find((s) => s.id === dragging);
      if (!stand) return;

      const newX = snapToGrid((e.clientX - rect.left) / zoom - dragOffset.x);
      const newY = snapToGrid((e.clientY - rect.top) / zoom - dragOffset.y);

      updateStand(dragging, { x: Math.max(0, newX), y: Math.max(0, newY) });
    } else if (resizing && canEdit) {
      const stand = stands.find((s) => s.id === resizing.id);
      if (!stand) return;

      const dx = (e.clientX - resizeStart.x) / zoom;
      const dy = (e.clientY - resizeStart.y) / zoom;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.standX;
      let newY = resizeStart.standY;

      if (resizing.handle.includes('e')) {
        newWidth = snapToGrid(Math.max(40, resizeStart.width + dx));
      }
      if (resizing.handle.includes('w')) {
        const deltaW = snapToGrid(dx);
        newWidth = Math.max(40, resizeStart.width - deltaW);
        newX = resizeStart.standX + (resizeStart.width - newWidth);
      }
      if (resizing.handle.includes('s')) {
        newHeight = snapToGrid(Math.max(40, resizeStart.height + dy));
      }
      if (resizing.handle.includes('n')) {
        const deltaH = snapToGrid(dy);
        newHeight = Math.max(40, resizeStart.height - deltaH);
        newY = resizeStart.standY + (resizeStart.height - newHeight);
      }

      updateStand(resizing.id, { width: newWidth, height: newHeight, x: newX, y: newY });
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [dragging, resizing, isPanning, stands, dragOffset, resizeStart, panStart, zoom, canEdit, spacePressed, snapToGrid, canvasRef, updateStand]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
    setIsPanning(false);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, standId: string, handle: string) => {
    if (!canEdit) return;
    e.stopPropagation();
    const stand = stands.find((s) => s.id === standId);
    if (!stand) return;

    setResizing({ id: standId, handle });
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: stand.width,
      height: stand.height,
      standX: stand.x,
      standY: stand.y,
    });
  }, [canEdit, stands]);

  return {
    // State
    zoom,
    pan,
    showGrid,
    snapToGridEnabled,
    isPanning,
    spacePressed,
    
    // Setters
    setZoom,
    setPan,
    setShowGrid,
    setSnapToGridEnabled,
    
    // Actions
    snapToGrid,
    fitToScreen,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleResizeStart,
  };
}
