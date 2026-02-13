/**
 * useEditorObjects – manages layout objects (stands, points, polygons)
 * with undo/redo stack (50 levels) and CRUD operations.
 */

import { useState, useCallback, useRef } from 'react';
import type { LayoutObject, LayoutStand, WorldPoint } from '@/types/floorplan-editor';

const MAX_UNDO = 50;

interface UndoState {
  objects: LayoutObject[];
}

export function useEditorObjects() {
  const [objects, setObjects] = useState<LayoutObject[]>([]);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);

  // Undo/redo stacks
  const undoStack = useRef<UndoState[]>([]);
  const redoStack = useRef<UndoState[]>([]);

  const pushUndo = useCallback((current: LayoutObject[]) => {
    undoStack.current.push({ objects: JSON.parse(JSON.stringify(current)) });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ objects: JSON.parse(JSON.stringify(objects)) });
    setObjects(prev.objects);
    setDirty(true);
  }, [objects]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ objects: JSON.parse(JSON.stringify(objects)) });
    setObjects(next.objects);
    setDirty(true);
  }, [objects]);

  // Load objects from API
  const loadObjects = useCallback((objs: LayoutObject[], ver: number) => {
    setObjects(objs);
    setVersion(ver);
    setDirty(false);
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  // Add object
  const addObject = useCallback((obj: LayoutObject) => {
    pushUndo(objects);
    setObjects(prev => [...prev, obj]);
    setDirty(true);
  }, [objects, pushUndo]);

  // Update object
  const updateObject = useCallback((id: string, updates: Partial<LayoutObject>) => {
    pushUndo(objects);
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updates } as LayoutObject : o));
    setDirty(true);
  }, [objects, pushUndo]);

  // Update without undo (for drag in progress)
  const updateObjectSilent = useCallback((id: string, updates: Partial<LayoutObject>) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updates } as LayoutObject : o));
    setDirty(true);
  }, []);

  // Delete objects
  const deleteObjects = useCallback((ids: Set<string>) => {
    pushUndo(objects);
    setObjects(prev => prev.filter(o => !ids.has(o.id)));
    setDirty(true);
  }, [objects, pushUndo]);

  // Move objects (with undo)
  const moveObjects = useCallback((ids: Set<string>, dx: number, dy: number) => {
    pushUndo(objects);
    setObjects(prev => prev.map(o => {
      if (!ids.has(o.id)) return o;
      if (o.type === 'stand' || o.type === 'polygon') {
        return { ...o, polygon: o.polygon.map(p => ({ x: p.x + dx, y: p.y + dy })) } as LayoutObject;
      }
      if (o.type === 'point') {
        return { ...o, position: { x: o.position.x + dx, y: o.position.y + dy } } as LayoutObject;
      }
      return o;
    }));
    setDirty(true);
  }, [objects, pushUndo]);

  // Create a rect stand
  const createRectStand = useCallback((x: number, y: number, w: number, h: number, label?: string): LayoutStand => {
    const id = crypto.randomUUID();
    const stand: LayoutStand = {
      id,
      type: 'stand',
      polygon: [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ],
      label: label || `S${objects.filter(o => o.type === 'stand').length + 1}`,
      status: 'AVAILABLE',
    };
    addObject(stand);
    return stand;
  }, [addObject, objects]);

  // Mark as saved
  const markSaved = useCallback((newVersion: number) => {
    setVersion(newVersion);
    setDirty(false);
  }, []);

  return {
    objects,
    version,
    dirty,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    loadObjects,
    addObject,
    updateObject,
    updateObjectSilent,
    deleteObjects,
    moveObjects,
    createRectStand,
    undo,
    redo,
    markSaved,
  };
}
