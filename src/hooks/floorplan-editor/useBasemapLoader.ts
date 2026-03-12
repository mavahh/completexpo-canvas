/**
 * useBasemapLoader – loads a HallBasemap with plattegrond + technisch SVG URLs.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HallBasemap, BasemapLayer, BBox } from '@/types/floorplan-editor';

/** Extended basemap with SVG-to-world scale factor */
export interface LoadedBasemap extends HallBasemap {
  svgScale: number;
}

export function useBasemapLoader(hallId: string | null) {
  const [basemap, setBasemap] = useState<HallBasemap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
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

      const widthM = Number(hall.width_meters) || 100;
      const heightM = Number(hall.height_meters) || 60;
      const bbox: BBox = { minX: 0, minY: 0, maxX: widthM, maxY: heightM };

      // Default basemap sub-layers
      const layers: BasemapLayer[] = [
        { id: 'walls', name: 'Muren', visible: true, kind: 'walls' },
        { id: 'text', name: 'Labels', visible: true, kind: 'text' },
        { id: 'lights', name: 'Verlichting', visible: false, kind: 'lights' },
        { id: 'other', name: 'Overig', visible: true, kind: 'other' },
      ];

      // Check for plattegrond + technisch SVGs in storage
      const basePath = `${id}`;
      const { data: plattegrondUrl } = supabase.storage.from('hall-backgrounds').getPublicUrl(`${basePath}/plattegrond.svg`);
      const { data: technischUrl } = supabase.storage.from('hall-backgrounds').getPublicUrl(`${basePath}/technisch.svg`);

      // Verify files exist by checking listing
      const { data: files } = await supabase.storage.from('hall-backgrounds').list(basePath);
      const fileNames = (files || []).map(f => f.name);
      const hasPlattegrond = fileNames.includes('plattegrond.svg');
      const hasTechnisch = fileNames.includes('technisch.svg');

      // Fallback: use legacy background_url as plattegrond
      const plattegrondSvgUrl = hasPlattegrond ? plattegrondUrl.publicUrl : (hall.background_url || '');
      const technischSvgUrl = hasTechnisch ? technischUrl.publicUrl : '';

      const result: HallBasemap = {
        hallId: hall.id,
        units: 'm',
        bbox,
        layers,
        svgUrl: plattegrondSvgUrl, // backward compat
        plattegrondSvgUrl,
        technischSvgUrl,
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
