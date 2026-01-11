import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Zap, Droplets, Lightbulb, Building2, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Database } from '@/integrations/supabase/types';

type PowerOption = Database['public']['Enums']['power_option'];
type SurfaceType = Database['public']['Enums']['surface_type'];

interface ExhibitorServices {
  id?: string;
  exhibitor_id: string;
  water_connections: number;
  power_option: PowerOption;
  light_points: number;
  construction_booked: boolean;
  carpet_included: boolean;
  surface_type: SurfaceType;
  notes: string | null;
}

interface ExhibitorServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exhibitorId: string;
  exhibitorName: string;
}

const powerOptions: { value: PowerOption; label: string }[] = [
  { value: 'NONE', label: 'Geen stroom' },
  { value: 'WATT_500', label: '500W' },
  { value: 'WATT_2000', label: '2000W' },
  { value: 'WATT_3500', label: '3500W' },
  { value: 'AMP_16A', label: '16A' },
  { value: 'AMP_32A', label: '32A' },
];

const surfaceTypes: { value: SurfaceType; label: string }[] = [
  { value: 'EMPTY', label: 'Leeg' },
  { value: 'EMPTY_WITH_CARPET', label: 'Leeg met tapijt' },
  { value: 'WITH_CONSTRUCTION', label: 'Met constructie' },
];

export function ExhibitorServicesDialog({
  open,
  onOpenChange,
  exhibitorId,
  exhibitorName,
}: ExhibitorServicesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ExhibitorServices>({
    exhibitor_id: exhibitorId,
    water_connections: 0,
    power_option: 'NONE',
    light_points: 0,
    construction_booked: false,
    carpet_included: false,
    surface_type: 'EMPTY',
    notes: null,
  });

  useEffect(() => {
    if (open && exhibitorId) {
      fetchServices();
    }
  }, [open, exhibitorId]);

  const fetchServices = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('exhibitor_services')
      .select('*')
      .eq('exhibitor_id', exhibitorId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching services:', error);
    }

    if (data) {
      setServices(data);
    } else {
      // Reset to defaults for new exhibitor
      setServices({
        exhibitor_id: exhibitorId,
        water_connections: 0,
        power_option: 'NONE',
        light_points: 0,
        construction_booked: false,
        carpet_included: false,
        surface_type: 'EMPTY',
        notes: null,
      });
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (services.id) {
        // Update existing
        const { error } = await supabase
          .from('exhibitor_services')
          .update({
            water_connections: services.water_connections,
            power_option: services.power_option,
            light_points: services.light_points,
            construction_booked: services.construction_booked,
            carpet_included: services.carpet_included,
            surface_type: services.surface_type,
            notes: services.notes,
          })
          .eq('id', services.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('exhibitor_services')
          .insert({
            exhibitor_id: exhibitorId,
            water_connections: services.water_connections,
            power_option: services.power_option,
            light_points: services.light_points,
            construction_booked: services.construction_booked,
            carpet_included: services.carpet_included,
            surface_type: services.surface_type,
            notes: services.notes,
          });

        if (error) throw error;
      }

      toast({
        title: 'Opgeslagen',
        description: 'Services zijn bijgewerkt',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Services - {exhibitorName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Power */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                Stroom
              </Label>
              <Select
                value={services.power_option}
                onValueChange={(value: PowerOption) =>
                  setServices({ ...services, power_option: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {powerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Water */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-info" />
                Wateraansluitingen
              </Label>
              <Input
                type="number"
                min={0}
                value={services.water_connections}
                onChange={(e) =>
                  setServices({ ...services, water_connections: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            {/* Light points */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-warning" />
                Lichtpunten
              </Label>
              <Input
                type="number"
                min={0}
                value={services.light_points}
                onChange={(e) =>
                  setServices({ ...services, light_points: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            {/* Surface type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                Oppervlakte type
              </Label>
              <Select
                value={services.surface_type}
                onValueChange={(value: SurfaceType) =>
                  setServices({ ...services, surface_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {surfaceTypes.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Constructie geboekt
                </Label>
                <Switch
                  checked={services.construction_booked}
                  onCheckedChange={(checked) =>
                    setServices({ ...services, construction_booked: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  Tapijt inbegrepen
                </Label>
                <Switch
                  checked={services.carpet_included}
                  onCheckedChange={(checked) =>
                    setServices({ ...services, carpet_included: checked })
                  }
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea
                value={services.notes || ''}
                onChange={(e) => setServices({ ...services, notes: e.target.value || null })}
                rows={3}
                placeholder="Extra opmerkingen over services..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Opslaan
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
