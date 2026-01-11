import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import { StandStatusSelect } from './StandStatusSelect';
import { ExhibitorServicesPanel } from './ExhibitorServicesPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Stand, ExhibitorMinimal, ExhibitorServices } from '@/types';
import { StandStatus } from './StandLegend';

interface StandPropertiesPanelProps {
  stand: Stand;
  exhibitors: ExhibitorMinimal[];
  exhibitorServices: ExhibitorServices[];
  activeExhibitorId: string | null;
  canEdit: boolean;
  onUpdateStand: (id: string, updates: Partial<Stand>) => void;
  onUpdateStandWithAutoStatus: (id: string, updates: Partial<Stand>) => void;
  onDeleteStand: () => void;
  getExhibitorName: (id: string | null) => string | null;
}

export function StandPropertiesPanel({
  stand,
  exhibitors,
  exhibitorServices,
  activeExhibitorId,
  canEdit,
  onUpdateStand,
  onUpdateStandWithAutoStatus,
  onDeleteStand,
  getExhibitorName,
}: StandPropertiesPanelProps) {
  const services = stand.exhibitor_id 
    ? exhibitorServices.find(s => s.exhibitor_id === stand.exhibitor_id) || null
    : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Standnummer</Label>
        <Input
          id="label"
          value={stand.label}
          onChange={(e) => onUpdateStand(stand.id, { label: e.target.value })}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <StandStatusSelect
          value={stand.status}
          onChange={(status) => onUpdateStand(stand.id, { status })}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <Label>Exposant</Label>
        <Select
          value={stand.exhibitor_id || 'none'}
          onValueChange={(value) =>
            onUpdateStandWithAutoStatus(stand.id, { exhibitor_id: value === 'none' ? null : value })
          }
          disabled={!canEdit}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecteer exposant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Geen exposant</SelectItem>
            {exhibitors.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canEdit && activeExhibitorId && !stand.exhibitor_id && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onUpdateStandWithAutoStatus(stand.id, { exhibitor_id: activeExhibitorId })}
          >
            Koppel actieve exposant
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="x">X</Label>
          <Input
            id="x"
            type="number"
            value={stand.x}
            onChange={(e) => onUpdateStand(stand.id, { x: Number(e.target.value) })}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="y">Y</Label>
          <Input
            id="y"
            type="number"
            value={stand.y}
            onChange={(e) => onUpdateStand(stand.id, { y: Number(e.target.value) })}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="width">Breedte</Label>
          <Input
            id="width"
            type="number"
            value={stand.width}
            onChange={(e) => onUpdateStand(stand.id, { width: Number(e.target.value) })}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Hoogte</Label>
          <Input
            id="height"
            type="number"
            value={stand.height}
            onChange={(e) => onUpdateStand(stand.id, { height: Number(e.target.value) })}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rotation">Rotatie (°)</Label>
        <Input
          id="rotation"
          type="number"
          value={stand.rotation}
          onChange={(e) => onUpdateStand(stand.id, { rotation: Number(e.target.value) })}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notities</Label>
        <Textarea
          id="notes"
          value={stand.notes || ''}
          onChange={(e) => onUpdateStand(stand.id, { notes: e.target.value })}
          rows={3}
          disabled={!canEdit}
        />
      </div>

      <ExhibitorServicesPanel
        exhibitorName={getExhibitorName(stand.exhibitor_id)}
        services={services}
      />

      {canEdit && (
        <Button
          variant="destructive"
          size="sm"
          className="w-full mt-4"
          onClick={onDeleteStand}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Stand verwijderen
        </Button>
      )}
    </div>
  );
}
