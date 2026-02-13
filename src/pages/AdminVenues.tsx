import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Plus, MapPin, Building2, Warehouse, Upload, AlertTriangle, Pencil, Trash2,
} from 'lucide-react';
import { useRef } from 'react';

interface Region {
  id: string;
  name: string;
  country: string;
  is_active: boolean;
}

interface Venue {
  id: string;
  region_id: string;
  name: string;
  city: string;
  address: string;
  is_active: boolean;
}

interface Hall {
  id: string;
  venue_id: string;
  name: string;
  width_meters: number;
  height_meters: number;
  scale_ratio: number;
  background_url: string | null;
  background_type: string | null;
  background_needs_conversion: boolean;
  is_active: boolean;
}

export default function AdminVenues() {
  const { isSuperAdmin, loading: authLoading } = useMultiTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<Region[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);

  // Dialog states
  const [regionDialog, setRegionDialog] = useState(false);
  const [venueDialog, setVenueDialog] = useState(false);
  const [hallDialog, setHallDialog] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  // Forms
  const [regionForm, setRegionForm] = useState({ name: '', country: '' });
  const [venueForm, setVenueForm] = useState({ name: '', city: '', address: '', region_id: '' });
  const [hallForm, setHallForm] = useState({ name: '', width_meters: 100, height_meters: 80, scale_ratio: 1, venue_id: '' });

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    const [r, v, h] = await Promise.all([
      supabase.from('regions').select('*').order('name'),
      supabase.from('venues').select('*').order('name'),
      supabase.from('halls').select('*').order('name'),
    ]);
    setRegions((r.data || []) as Region[]);
    setVenues((v.data || []) as Venue[]);
    setHalls((h.data || []) as Hall[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchAll();
  }, [isSuperAdmin, fetchAll]);

  // ── Region CRUD ───────────────────────────────
  const saveRegion = async () => {
    if (!regionForm.name) return;
    if (editingRegion) {
      await supabase.from('regions').update({ name: regionForm.name, country: regionForm.country }).eq('id', editingRegion.id);
    } else {
      await supabase.from('regions').insert({ name: regionForm.name, country: regionForm.country });
    }
    setRegionDialog(false);
    setEditingRegion(null);
    setRegionForm({ name: '', country: '' });
    fetchAll();
    toast({ title: editingRegion ? 'Regio bijgewerkt' : 'Regio aangemaakt' });
  };

  const deleteRegion = async (id: string) => {
    await supabase.from('regions').delete().eq('id', id);
    fetchAll();
    toast({ title: 'Regio verwijderd' });
  };

  // ── Venue CRUD ────────────────────────────────
  const saveVenue = async () => {
    if (!venueForm.name || !venueForm.region_id) return;
    if (editingVenue) {
      await supabase.from('venues').update({
        name: venueForm.name, city: venueForm.city, address: venueForm.address, region_id: venueForm.region_id,
      }).eq('id', editingVenue.id);
    } else {
      await supabase.from('venues').insert({
        name: venueForm.name, city: venueForm.city, address: venueForm.address, region_id: venueForm.region_id,
      });
    }
    setVenueDialog(false);
    setEditingVenue(null);
    setVenueForm({ name: '', city: '', address: '', region_id: '' });
    fetchAll();
    toast({ title: editingVenue ? 'Venue bijgewerkt' : 'Venue aangemaakt' });
  };

  // ── Hall CRUD ─────────────────────────────────
  const saveHall = async () => {
    if (!hallForm.name || !hallForm.venue_id) return;
    if (editingHall) {
      await supabase.from('halls').update({
        name: hallForm.name,
        width_meters: hallForm.width_meters,
        height_meters: hallForm.height_meters,
        scale_ratio: hallForm.scale_ratio,
        venue_id: hallForm.venue_id,
      }).eq('id', editingHall.id);
    } else {
      await supabase.from('halls').insert({
        name: hallForm.name,
        width_meters: hallForm.width_meters,
        height_meters: hallForm.height_meters,
        scale_ratio: hallForm.scale_ratio,
        venue_id: hallForm.venue_id,
      });
    }
    setHallDialog(false);
    setEditingHall(null);
    setHallForm({ name: '', width_meters: 100, height_meters: 80, scale_ratio: 1, venue_id: '' });
    fetchAll();
    toast({ title: editingHall ? 'Hal bijgewerkt' : 'Hal aangemaakt' });
  };

  // ── Background upload ─────────────────────────
  const handleBackgroundUpload = async (hallId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['svg', 'pdf', 'dxf', 'dwg'];
    if (!validExts.includes(ext)) {
      toast({ variant: 'destructive', title: 'Ongeldig bestandstype', description: 'Upload een SVG, PDF, DXF of DWG bestand.' });
      setUploading(false);
      return;
    }

    const isDwg = ext === 'dwg';
    const fileName = `${hallId}-${Date.now()}.${ext}`;
    const filePath = `halls/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('hall-backgrounds')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hall-backgrounds')
        .getPublicUrl(filePath);

      await supabase.from('halls').update({
        background_url: publicUrl,
        background_type: ext,
        background_needs_conversion: isDwg,
      }).eq('id', hallId);

      if (isDwg) {
        toast({
          title: 'DWG bestand geüpload',
          description: 'Dit bestand moet extern geconverteerd worden naar SVG voor gebruik als achtergrond.',
        });
      } else {
        toast({ title: 'Achtergrond geüpload' });
      }
      fetchAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload mislukt', description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (table: string, id: string, current: boolean) => {
    await supabase.from(table as any).update({ is_active: !current }).eq('id', id);
    fetchAll();
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!isSuperAdmin) {
    return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Geen toegang.</p></div>;
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Venues & Hallen</h1>
          <p className="text-muted-foreground">Beheer regio's, venues en hallen</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingRegion(null); setRegionForm({ name: '', country: '' }); setRegionDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" />Regio
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setEditingVenue(null); setVenueForm({ name: '', city: '', address: '', region_id: regions[0]?.id || '' }); setVenueDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" />Venue
          </Button>
          <Button size="sm" onClick={() => { setEditingHall(null); setHallForm({ name: '', width_meters: 100, height_meters: 80, scale_ratio: 1, venue_id: venues[0]?.id || '' }); setHallDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" />Hal
          </Button>
        </div>
      </div>

      {/* Region → Venue → Hall tree */}
      <Accordion type="multiple" className="space-y-3">
        {regions.map(region => {
          const regionVenues = venues.filter(v => v.region_id === region.id);
          return (
            <AccordionItem key={region.id} value={region.id} className="border rounded-lg bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <span className="font-semibold">{region.name}</span>
                    {region.country && <span className="text-muted-foreground ml-2 text-sm">{region.country}</span>}
                  </div>
                  <Badge variant={region.is_active ? 'default' : 'secondary'} className="ml-auto mr-4">
                    {region.is_active ? 'Actief' : 'Inactief'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{regionVenues.length} venues</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingRegion(region); setRegionForm({ name: region.name, country: region.country }); setRegionDialog(true); }}>
                    <Pencil className="w-3 h-3 mr-1" />Bewerken
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive('regions', region.id, region.is_active)}>
                    {region.is_active ? 'Deactiveren' : 'Activeren'}
                  </Button>
                </div>

                {regionVenues.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic pl-4">Geen venues in deze regio</p>
                ) : (
                  <div className="space-y-3 pl-4">
                    {regionVenues.map(venue => {
                      const venueHalls = halls.filter(h => h.venue_id === venue.id);
                      return (
                        <Card key={venue.id} className="border">
                          <CardHeader className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                <CardTitle className="text-base">{venue.name}</CardTitle>
                                {venue.city && <span className="text-sm text-muted-foreground">— {venue.city}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={venue.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {venue.is_active ? 'Actief' : 'Inactief'}
                                </Badge>
                                <Button size="sm" variant="ghost" onClick={() => {
                                  setEditingVenue(venue);
                                  setVenueForm({ name: venue.name, city: venue.city, address: venue.address, region_id: venue.region_id });
                                  setVenueDialog(true);
                                }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2 px-4">
                            {venueHalls.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">Geen hallen</p>
                            ) : (
                              <div className="space-y-2">
                                {venueHalls.map(hall => (
                                  <div key={hall.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                      <Warehouse className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <p className="font-medium text-sm">{hall.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {hall.width_meters}m × {hall.height_meters}m — Schaal 1:{hall.scale_ratio}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {hall.background_needs_conversion && (
                                        <Badge variant="destructive" className="text-xs gap-1">
                                          <AlertTriangle className="w-3 h-3" />DWG
                                        </Badge>
                                      )}
                                      {hall.background_url && !hall.background_needs_conversion && (
                                        <Badge className="text-xs bg-green-600">BG</Badge>
                                      )}
                                      <label className="cursor-pointer">
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept=".svg,.pdf,.dxf,.dwg"
                                          onChange={(e) => handleBackgroundUpload(hall.id, e)}
                                        />
                                        <Button size="sm" variant="ghost" asChild disabled={uploading}>
                                          <span><Upload className="w-3 h-3" /></span>
                                        </Button>
                                      </label>
                                      <Button size="sm" variant="ghost" onClick={() => {
                                        setEditingHall(hall);
                                        setHallForm({
                                          name: hall.name,
                                          width_meters: hall.width_meters,
                                          height_meters: hall.height_meters,
                                          scale_ratio: hall.scale_ratio,
                                          venue_id: hall.venue_id,
                                        });
                                        setHallDialog(true);
                                      }}>
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {regions.length === 0 && (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-1">Nog geen regio's</h3>
          <p className="text-sm text-muted-foreground mb-4">Begin met het aanmaken van een regio.</p>
          <Button onClick={() => { setRegionForm({ name: '', country: '' }); setRegionDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" />Regio aanmaken
          </Button>
        </Card>
      )}

      {/* Region Dialog */}
      <Dialog open={regionDialog} onOpenChange={setRegionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRegion ? 'Regio bewerken' : 'Nieuwe regio'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={regionForm.name} onChange={e => setRegionForm(f => ({ ...f, name: e.target.value }))} placeholder="Bijv. België" />
            </div>
            <div className="space-y-2">
              <Label>Land</Label>
              <Input value={regionForm.country} onChange={e => setRegionForm(f => ({ ...f, country: e.target.value }))} placeholder="Bijv. BE" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegionDialog(false)}>Annuleren</Button>
            <Button onClick={saveRegion}>{editingRegion ? 'Opslaan' : 'Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Venue Dialog */}
      <Dialog open={venueDialog} onOpenChange={setVenueDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingVenue ? 'Venue bewerken' : 'Nieuwe venue'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Regio *</Label>
              <Select value={venueForm.region_id} onValueChange={v => setVenueForm(f => ({ ...f, region_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecteer regio" /></SelectTrigger>
                <SelectContent>
                  {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={venueForm.name} onChange={e => setVenueForm(f => ({ ...f, name: e.target.value }))} placeholder="Bijv. Brussels Expo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stad</Label>
                <Input value={venueForm.city} onChange={e => setVenueForm(f => ({ ...f, city: e.target.value }))} placeholder="Brussel" />
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input value={venueForm.address} onChange={e => setVenueForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVenueDialog(false)}>Annuleren</Button>
            <Button onClick={saveVenue}>{editingVenue ? 'Opslaan' : 'Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hall Dialog */}
      <Dialog open={hallDialog} onOpenChange={setHallDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingHall ? 'Hal bewerken' : 'Nieuwe hal'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Venue *</Label>
              <Select value={hallForm.venue_id} onValueChange={v => setHallForm(f => ({ ...f, venue_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecteer venue" /></SelectTrigger>
                <SelectContent>
                  {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={hallForm.name} onChange={e => setHallForm(f => ({ ...f, name: e.target.value }))} placeholder="Bijv. Hal 1" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Breedte (m)</Label>
                <Input type="number" value={hallForm.width_meters} onChange={e => setHallForm(f => ({ ...f, width_meters: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Hoogte (m)</Label>
                <Input type="number" value={hallForm.height_meters} onChange={e => setHallForm(f => ({ ...f, height_meters: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Schaal</Label>
                <Input type="number" step="0.01" value={hallForm.scale_ratio} onChange={e => setHallForm(f => ({ ...f, scale_ratio: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHallDialog(false)}>Annuleren</Button>
            <Button onClick={saveHall}>{editingHall ? 'Opslaan' : 'Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
