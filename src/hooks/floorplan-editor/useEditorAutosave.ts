/**
 * useEditorAutosave – debounced auto-save for layout objects.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LayoutObject } from '@/types/floorplan-editor';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseEditorAutosaveOptions {
  eventId: string | undefined;
  hallId: string | undefined;
  objects: LayoutObject[];
  version: number;
  dirty: boolean;
  onSaved: (newVersion: number) => void;
  debounceMs?: number;
}

export function useEditorAutosave({
  eventId,
  hallId,
  objects,
  version,
  dirty,
  onSaved,
  debounceMs = 1500,
}: UseEditorAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const save = useCallback(async () => {
    if (!eventId || !hallId || savingRef.current) return;
    savingRef.current = true;
    setSaveStatus('saving');

    try {
      const { data, error } = await supabase.functions.invoke('event-layout', {
        method: 'PUT',
        body: {
          eventId,
          hallId,
          objects,
          version,
        },
      });

      if (error) throw error;

      const newVersion = data?.version || version + 1;
      onSaved(newVersion);
      setSaveStatus('saved');

      // Reset to idle after 2s
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Autosave error:', e);
      setSaveStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, [eventId, hallId, objects, version, onSaved]);

  // Debounce save when dirty
  useEffect(() => {
    if (!dirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dirty, objects, save, debounceMs]);

  return { saveStatus, saveNow: save };
}
