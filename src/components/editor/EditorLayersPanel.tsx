import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Lock, Unlock, Layers } from 'lucide-react';

export interface EditorLayer {
  id: string;
  name: string;
  type: 'background' | 'stands' | 'labels' | 'technical' | 'electrical' | 'custom';
  isVisible: boolean;
  isLocked: boolean;
  sortOrder: number;
}

const DEFAULT_LAYERS: EditorLayer[] = [
  { id: 'background', name: 'Achtergrond', type: 'background', isVisible: true, isLocked: true, sortOrder: 0 },
  { id: 'stands', name: 'Stands', type: 'stands', isVisible: true, isLocked: false, sortOrder: 1 },
  { id: 'labels', name: 'Labels', type: 'labels', isVisible: true, isLocked: false, sortOrder: 2 },
  { id: 'technical', name: 'Technisch', type: 'technical', isVisible: true, isLocked: false, sortOrder: 3 },
  { id: 'electrical', name: 'Elektra', type: 'electrical', isVisible: true, isLocked: false, sortOrder: 4 },
];

interface EditorLayersPanelProps {
  layers?: EditorLayer[];
  onLayerChange?: (layers: EditorLayer[]) => void;
}

export function EditorLayersPanel({ layers: externalLayers, onLayerChange }: EditorLayersPanelProps) {
  const [layers, setLayers] = useState<EditorLayer[]>(externalLayers || DEFAULT_LAYERS);

  const updateLayer = (id: string, updates: Partial<EditorLayer>) => {
    const updated = layers.map(l => l.id === id ? { ...l, ...updates } : l);
    setLayers(updated);
    onLayerChange?.(updated);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Layers className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Lagen</span>
      </div>
      {layers.map(layer => (
        <div
          key={layer.id}
          className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
        >
          <span className="text-sm text-foreground">{layer.name}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => updateLayer(layer.id, { isVisible: !layer.isVisible })}
            >
              {layer.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (layer.type === 'background') return; // Background always locked
                updateLayer(layer.id, { isLocked: !layer.isLocked });
              }}
              disabled={layer.type === 'background'}
            >
              {layer.isLocked ? <Lock className="w-3.5 h-3.5 text-primary" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
