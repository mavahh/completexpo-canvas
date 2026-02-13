/**
 * EditorRightPanel – layers toggles + properties inspector.
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Layers, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { BasemapLayer, LayoutObject, LayoutStand } from '@/types/floorplan-editor';

interface Exhibitor {
  id: string;
  name: string;
}

interface EditorRightPanelProps {
  layers: BasemapLayer[];
  onToggleLayer: (id: string) => void;
  objects: LayoutObject[];
  selectedIds: Set<string>;
  exhibitors: Exhibitor[];
  units: string;
  onUpdateObject: (id: string, updates: Partial<LayoutObject>) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function getStandBounds(stand: LayoutStand) {
  const xs = stand.polygon.map(p => p.x);
  const ys = stand.polygon.map(p => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

export function EditorRightPanel({
  layers, onToggleLayer, objects, selectedIds, exhibitors, units,
  onUpdateObject, collapsed, onToggleCollapse,
}: EditorRightPanelProps) {
  const [activeTab, setActiveTab] = useState('properties');

  const selectedObjects = objects.filter(o => selectedIds.has(o.id));
  const singleSelected = selectedObjects.length === 1 ? selectedObjects[0] : null;

  if (collapsed) {
    return (
      <div className="w-8 border-l border-border bg-card flex flex-col items-center pt-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-56 border-l border-border bg-card flex flex-col shrink-0">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Eigenschappen</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onToggleCollapse}>
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-1 h-7">
          <TabsTrigger value="properties" className="text-xs h-6 gap-1">
            <Settings2 className="w-3 h-3" /> Eigenschappen
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs h-6 gap-1">
            <Layers className="w-3 h-3" /> Lagen
          </TabsTrigger>
        </TabsList>

        {/* Properties tab */}
        <TabsContent value="properties" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="px-3 py-2 space-y-3">
              {!singleSelected ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {selectedObjects.length > 1
                    ? `${selectedObjects.length} objecten geselecteerd`
                    : 'Selecteer een object'
                  }
                </p>
              ) : singleSelected.type === 'stand' ? (
                <StandProperties
                  stand={singleSelected}
                  exhibitors={exhibitors}
                  units={units}
                  onUpdate={(updates) => onUpdateObject(singleSelected.id, updates)}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Object type: {singleSelected.type}</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Layers tab */}
        <TabsContent value="layers" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="px-2 py-2 space-y-0.5">
              {layers.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">Geen lagen</p>
              ) : (
                layers.map(layer => (
                  <button
                    key={layer.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-xs transition-colors"
                    onClick={() => onToggleLayer(layer.id)}
                  >
                    {layer.visible
                      ? <Eye className="w-3.5 h-3.5 text-foreground" />
                      : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                    <span className={cn('flex-1 text-left', !layer.visible && 'text-muted-foreground')}>
                      {layer.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Property editor for a single stand */
function StandProperties({
  stand, exhibitors, units, onUpdate,
}: {
  stand: LayoutStand;
  exhibitors: Exhibitor[];
  units: string;
  onUpdate: (updates: Partial<LayoutStand>) => void;
}) {
  const bounds = getStandBounds(stand);
  const unitLabel = units === 'mm' ? 'mm' : 'm';

  return (
    <>
      {/* Position */}
      <div>
        <Label className="text-xs text-muted-foreground">Positie</Label>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <div>
            <span className="text-[10px] text-muted-foreground">X</span>
            <Input
              value={Math.round(bounds.x * 100) / 100}
              className="h-6 text-xs"
              readOnly
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Y</span>
            <Input
              value={Math.round(bounds.y * 100) / 100}
              className="h-6 text-xs"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div>
        <Label className="text-xs text-muted-foreground">Afmetingen ({unitLabel})</Label>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <div>
            <span className="text-[10px] text-muted-foreground">B</span>
            <Input
              value={Math.round(bounds.w * 100) / 100}
              className="h-6 text-xs"
              readOnly
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">H</span>
            <Input
              value={Math.round(bounds.h * 100) / 100}
              className="h-6 text-xs"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Area */}
      <div>
        <Label className="text-xs text-muted-foreground">Oppervlakte</Label>
        <p className="text-xs font-medium">{Math.round(bounds.w * bounds.h * 100) / 100} {unitLabel}²</p>
      </div>

      {/* Label */}
      <div>
        <Label className="text-xs text-muted-foreground">Standnr.</Label>
        <Input
          value={stand.label || ''}
          onChange={e => onUpdate({ label: e.target.value })}
          className="h-7 text-xs mt-0.5"
          placeholder="bv. A01"
        />
      </div>

      {/* Exhibitor */}
      <div>
        <Label className="text-xs text-muted-foreground">Exposant</Label>
        <Select
          value={stand.exhibitorId || '_none'}
          onValueChange={v => onUpdate({ exhibitorId: v === '_none' ? undefined : v })}
        >
          <SelectTrigger className="h-7 text-xs mt-0.5">
            <SelectValue placeholder="Geen exposant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Geen exposant</SelectItem>
            {exhibitors.map(ex => (
              <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div>
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select
          value={stand.status || 'AVAILABLE'}
          onValueChange={v => onUpdate({ status: v })}
        >
          <SelectTrigger className="h-7 text-xs mt-0.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AVAILABLE">Beschikbaar</SelectItem>
            <SelectItem value="RESERVED">Gereserveerd</SelectItem>
            <SelectItem value="SOLD">Verkocht</SelectItem>
            <SelectItem value="BLOCKED">Geblokkeerd</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
