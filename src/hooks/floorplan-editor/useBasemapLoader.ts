/**
 * useBasemapLoader – loads a HallBasemap from the backend or creates a mock.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HallBasemap, BasemapLayer, BBox } from '@/types/floorplan-editor';

export function useBasemapLoader(hallId: string | null) {
  const [basemap, setBasemap] = useState<HallBasemap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Load hall data from DB
      const { data: hall, error: hallError } = await supabase
        .from('halls')
        .select('id, name, width_meters, height_meters, scale_ratio, background_url, background_type')
        .eq('id', id)
        .single();

      if (hallError || !hall) {
        setError('Hal niet gevonden');
        setLoading(false);
        return;
      }

      // Build basemap from hall data
      const widthM = Number(hall.width_meters) || 100;
      const heightM = Number(hall.height_meters) || 60;

      const bbox: BBox = { minX: 0, minY: 0, maxX: widthM, maxY: heightM };

      // Default layers
      const layers: BasemapLayer[] = [
        { id: 'walls', name: 'Muren', visible: true, kind: 'walls' },
        { id: 'text', name: 'Labels', visible: true, kind: 'text' },
        { id: 'lights', name: 'Verlichting', visible: false, kind: 'lights' },
        { id: 'other', name: 'Overig', visible: true, kind: 'other' },
      ];

      const result: HallBasemap = {
        hallId: hall.id,
        units: 'm',
        bbox,
        layers,
        svgUrl: hall.background_url || '',
        updatedAt: new Date().toISOString(),
      };

      setBasemap(result);
    } catch (e) {
      setError('Fout bij laden basemap');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hallId) load(hallId);
    else setBasemap(null);
  }, [hallId, load]);

  return { basemap, loading, error, reload: () => hallId && load(hallId) };
}
