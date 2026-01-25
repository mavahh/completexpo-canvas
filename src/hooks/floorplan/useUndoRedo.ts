import { useState, useCallback, useRef } from 'react';
import type { Stand } from '@/types';

export interface UndoRedoAction {
  type: 'create' | 'delete' | 'update' | 'bulk_update';
  timestamp: number;
  // For create: the created stand
  created?: Stand;
  // For delete: the deleted stands
  deleted?: Stand[];
  // For update: standId -> { before, after }
  updates?: Map<string, { before: Partial<Stand>; after: Partial<Stand> }>;
}

interface UseUndoRedoProps {
  stands: Stand[];
  setStands: React.Dispatch<React.SetStateAction<Stand[]>>;
  setDirty: (dirty: boolean) => void;
  setSelectedStandIds: (ids: Set<string>) => void;
}

const MAX_HISTORY_SIZE = 100;

export function useUndoRedo({
  stands,
  setStands,
  setDirty,
  setSelectedStandIds,
}: UseUndoRedoProps) {
  const [undoStack, setUndoStack] = useState<UndoRedoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoAction[]>([]);
  
  // Track if we're currently applying undo/redo to prevent recursive pushes
  const isApplyingRef = useRef(false);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Push action to undo stack
  const pushAction = useCallback((action: Omit<UndoRedoAction, 'timestamp'>) => {
    if (isApplyingRef.current) return;
    
    setUndoStack(prev => {
      const newStack = [...prev, { ...action, timestamp: Date.now() }];
      if (newStack.length > MAX_HISTORY_SIZE) {
        return newStack.slice(-MAX_HISTORY_SIZE);
      }
      return newStack;
    });
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  // Record a stand creation
  const recordCreate = useCallback((stand: Stand) => {
    pushAction({ type: 'create', created: stand });
  }, [pushAction]);

  // Record stand deletion
  const recordDelete = useCallback((deletedStands: Stand[]) => {
    pushAction({ type: 'delete', deleted: deletedStands });
  }, [pushAction]);

  // Record stand update(s)
  const recordUpdate = useCallback((updates: Map<string, { before: Partial<Stand>; after: Partial<Stand> }>) => {
    pushAction({ type: 'update', updates });
  }, [pushAction]);

  // Apply undo
  const undo = useCallback(() => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;

    isApplyingRef.current = true;

    try {
      if (action.type === 'create' && action.created) {
        // Undo create = delete the stand
        setStands(prev => prev.filter(s => s.id !== action.created!.id));
        setSelectedStandIds(new Set());
      } else if (action.type === 'delete' && action.deleted) {
        // Undo delete = restore the stands
        setStands(prev => [...prev, ...action.deleted!]);
        setSelectedStandIds(new Set(action.deleted.map(s => s.id)));
      } else if (action.type === 'update' && action.updates) {
        // Undo update = apply 'before' values
        setStands(prev => prev.map(stand => {
          const update = action.updates!.get(stand.id);
          if (update) {
            return { ...stand, ...update.before };
          }
          return stand;
        }));
      }

      setDirty(true);
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, action]);
    } finally {
      isApplyingRef.current = false;
    }
  }, [undoStack, setStands, setDirty, setSelectedStandIds]);

  // Apply redo
  const redo = useCallback(() => {
    const action = redoStack[redoStack.length - 1];
    if (!action) return;

    isApplyingRef.current = true;

    try {
      if (action.type === 'create' && action.created) {
        // Redo create = add the stand back
        setStands(prev => [...prev, action.created!]);
        setSelectedStandIds(new Set([action.created.id]));
      } else if (action.type === 'delete' && action.deleted) {
        // Redo delete = remove the stands again
        const deletedIds = new Set(action.deleted.map(s => s.id));
        setStands(prev => prev.filter(s => !deletedIds.has(s.id)));
        setSelectedStandIds(new Set());
      } else if (action.type === 'update' && action.updates) {
        // Redo update = apply 'after' values
        setStands(prev => prev.map(stand => {
          const update = action.updates!.get(stand.id);
          if (update) {
            return { ...stand, ...update.after };
          }
          return stand;
        }));
      }

      setDirty(true);
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, action]);
    } finally {
      isApplyingRef.current = false;
    }
  }, [redoStack, setStands, setDirty, setSelectedStandIds]);

  // Clear history
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    recordCreate,
    recordDelete,
    recordUpdate,
    clearHistory,
    undoStackSize: undoStack.length,
    redoStackSize: redoStack.length,
  };
}
