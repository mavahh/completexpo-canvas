/**
 * LayerPanel – toggleable layer list for the basemap.
 */

import { Eye, EyeOff, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BasemapLayer } from '@/types/floorplan-editor';

interface LayerPanelProps {
  layers: BasemapLayer[];
  onToggle: (layerId: string) => void;
}

const LAYER_ICONS: Record<string, string> = {
  walls: '🧱',
  lights: '💡',
  text: '🏷️',
  other: '📐',
};

export function LayerPanel({ layers, onToggle }: LayerPanelProps) {
  return (
    <div className="absolute top-3 right-3 z-30 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Lagen</span>
      </div>
      <div className="p-1">
        {layers.map(layer => (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted transition-colors text-left"
          >
            <span className="text-sm">{LAYER_ICONS[layer.kind] || '📄'}</span>
            <span className="text-xs flex-1 text-foreground">{layer.name}</span>
            {layer.visible ? (
              <Eye className="w-3.5 h-3.5 text-primary" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
