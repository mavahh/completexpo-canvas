import { useState, useCallback, useRef } from 'react';
import type { Floorplan } from '@/types';

export type EditorTool = 'select' | 'draw';

interface DrawRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface UseDrawModeProps {
  floorplan: Floorplan | undefined;
  zoom: number;
  pan: { x: number; y: number };
  snapToGrid: (value: number) => number;
  onStandCreated: (x: number, y: number, width: number, height: number) => void;
}

export function useDrawMode({
  floorplan,
  zoom,
  pan,
  snapToGrid,
  onStandCreated,
}: UseDrawModeProps) {
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawRect, setDrawRect] = useState<DrawRect | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  const canvasRectRef = useRef<DOMRect | null>(null);

  const startDraw = useCallback((e: React.MouseEvent, canvasRect: DOMRect) => {
    if (activeTool !== 'draw' || !floorplan) return false;

    canvasRectRef.current = canvasRect;
    const x = snapToGrid((e.clientX - canvasRect.left - pan.x) / zoom);
    const y = snapToGrid((e.clientY - canvasRect.top - pan.y) / zoom);

    setDrawRect({ startX: x, startY: y, endX: x, endY: y });
    setIsDrawing(true);
    return true;
  }, [activeTool, floorplan, zoom, pan, snapToGrid]);

  const updateDraw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !drawRect || !canvasRectRef.current) return;

    const canvasRect = canvasRectRef.current;
    let x = snapToGrid((e.clientX - canvasRect.left - pan.x) / zoom);
    let y = snapToGrid((e.clientY - canvasRect.top - pan.y) / zoom);

    // Keep aspect ratio if shift is pressed
    if (shiftPressed) {
      const width = Math.abs(x - drawRect.startX);
      const height = Math.abs(y - drawRect.startY);
      const size = Math.max(width, height);
      x = drawRect.startX + (x > drawRect.startX ? size : -size);
      y = drawRect.startY + (y > drawRect.startY ? size : -size);
    }

    // Clamp to canvas bounds
    if (floorplan) {
      x = Math.max(0, Math.min(floorplan.width, x));
      y = Math.max(0, Math.min(floorplan.height, y));
    }

    setDrawRect(prev => prev ? { ...prev, endX: x, endY: y } : null);
  }, [isDrawing, drawRect, zoom, pan, snapToGrid, shiftPressed, floorplan]);

  const endDraw = useCallback(() => {
    if (!isDrawing || !drawRect) {
      setIsDrawing(false);
      setDrawRect(null);
      return;
    }

    const minX = Math.min(drawRect.startX, drawRect.endX);
    const minY = Math.min(drawRect.startY, drawRect.endY);
    const width = Math.abs(drawRect.endX - drawRect.startX);
    const height = Math.abs(drawRect.endY - drawRect.startY);

    // Only create if minimum size met
    if (width >= 20 && height >= 20) {
      onStandCreated(minX, minY, width, height);
    }

    setIsDrawing(false);
    setDrawRect(null);
    // Switch back to select tool after creating
    setActiveTool('select');
  }, [isDrawing, drawRect, onStandCreated]);

  const cancelDraw = useCallback(() => {
    setIsDrawing(false);
    setDrawRect(null);
    setActiveTool('select');
  }, []);

  // Get normalized rect for rendering
  const getNormalizedDrawRect = useCallback(() => {
    if (!drawRect) return null;
    return {
      x: Math.min(drawRect.startX, drawRect.endX),
      y: Math.min(drawRect.startY, drawRect.endY),
      width: Math.abs(drawRect.endX - drawRect.startX),
      height: Math.abs(drawRect.endY - drawRect.startY),
    };
  }, [drawRect]);

  return {
    activeTool,
    setActiveTool,
    isDrawing,
    drawRect: getNormalizedDrawRect(),
    startDraw,
    updateDraw,
    endDraw,
    cancelDraw,
    setShiftPressed,
  };
}
