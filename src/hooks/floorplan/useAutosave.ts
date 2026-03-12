import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Stand } from '@/types';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface UseAutosaveProps {
  stands: Stand[];
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  eventId: string | undefined;
  canEdit: boolean;
  debounceMs?: number;
}

export function useAutosave({
  stands,
  dirty,
  setDirty,
  eventId,
  canEdit,
  debounceMs = 800,
}: UseAutosaveProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const standsRef = useRef(stands);
  
  // Keep ref updated
  useEffect(() => {
    standsRef.current = stands;
  }, [stands]);

  // Update status when dirty changes
  useEffect(() => {
    if (dirty && saveStatus === 'saved') {
      setSaveStatus('unsaved');
    }
  }, [dirty, saveStatus]);

  // Autosave with debounce
  const triggerAutosave = useCallback(() => {
    if (!canEdit || !eventId) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('unsaved');

    // Set new timeout for autosave
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');

      try {
        const currentStands = standsRef.current;
        
        // Batch update all stands
        const updates = currentStands.map(stand => ({
          id: stand.id,
          x: stand.x,
          y: stand.y,
          width: stand.width,
          height: stand.height,
          rotation: stand.rotation,
          label: stand.label,
          exhibitor_id: stand.exhibitor_id,
          color: stand.color,
          notes: stand.notes,
          status: stand.status,
        }));

        // Use upsert for efficiency
        for (const update of updates) {
          await supabase
            .from('stands')
            .update(update)
            .eq('id', update.id);
        }

        setDirty(false);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } catch (error) {
        console.error('Autosave failed:', error);
        setSaveStatus('error');
      }
    }, debounceMs);
  }, [canEdit, eventId, setDirty, debounceMs]);

  // Manual save
  const saveNow = useCallback(async () => {
    if (!canEdit || !eventId) return;

    // Clear pending autosave
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setSaveStatus('saving');

    try {
      const currentStands = standsRef.current;
      
      for (const stand of currentStands) {
        await supabase
          .from('stands')
          .update({
            x: stand.x,
            y: stand.y,
            width: stand.width,
            height: stand.height,
            rotation: stand.rotation,
            label: stand.label,
            exhibitor_id: stand.exhibitor_id,
            color: stand.color,
            notes: stand.notes,
            status: stand.status,
          })
          .eq('id', stand.id);
      }

      setDirty(false);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
    }
  }, [canEdit, eventId, setDirty]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSavedAt,
    triggerAutosave,
    saveNow,
  };
}
