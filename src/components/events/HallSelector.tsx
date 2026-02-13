import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MapPin, Building2, Warehouse } from 'lucide-react';

interface Region { id: string; name: string; country: string; }
interface Venue { id: string; region_id: string; name: string; city: string; }
interface Hall { id: string; venue_id: string; name: string; width_meters: number; height_meters: number; }

interface HallSelectorProps {
  value: string | null;
  onChange: (hallId: string | null) => void;
  disabled?: boolean;
}

export function HallSelector({ value, onChange, disabled }: HallSelectorProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      const [r, v, h] = await Promise.all([
        supabase.from('regions').select('id, name, country').eq('is_active', true).order('name'),
        supabase.from('venues').select('id, region_id, name, city').eq('is_active', true).order('name'),
        supabase.from('halls').select('id, venue_id, name, width_meters, height_meters').eq('is_active', true).order('name'),
      ]);
      setRegions((r.data || []) as Region[]);
      setVenues((v.data || []) as Venue[]);
      setHalls((h.data || []) as Hall[]);

      // If there's a current value, reverse-resolve region/venue
      if (value) {
        const hall = (h.data || []).find((x: any) => x.id === value);
        if (hall) {
          const venue = (v.data || []).find((x: any) => x.id === (hall as any).venue_id);
          if (venue) {
            setSelectedVenueId((venue as any).id);
            setSelectedRegionId((venue as any).region_id);
          }
        }
      }
    };
    fetchData();
  }, [value]);

  const filteredVenues = venues.filter(v => v.region_id === selectedRegionId);
  const filteredHalls = halls.filter(h => h.venue_id === selectedVenueId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Regio
        </Label>
        <Select
          value={selectedRegionId}
          onValueChange={(v) => {
            setSelectedRegionId(v);
            setSelectedVenueId('');
            onChange(null);
          }}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue placeholder="Selecteer regio..." /></SelectTrigger>
          <SelectContent>
            {regions.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} {r.country && `(${r.country})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRegionId && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Venue
          </Label>
          <Select
            value={selectedVenueId}
            onValueChange={(v) => {
              setSelectedVenueId(v);
              onChange(null);
            }}
            disabled={disabled || filteredVenues.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Selecteer venue..." /></SelectTrigger>
            <SelectContent>
              {filteredVenues.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} {v.city && `— ${v.city}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedVenueId && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-primary" />
            Hal
          </Label>
          <Select
            value={value || ''}
            onValueChange={(v) => onChange(v)}
            disabled={disabled || filteredHalls.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Selecteer hal..." /></SelectTrigger>
            <SelectContent>
              {filteredHalls.map(h => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name} ({h.width_meters}m × {h.height_meters}m)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
