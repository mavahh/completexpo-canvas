import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  MapPin, 
  Building2,
  Zap,
  Droplets,
  Lightbulb
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface PortalToken {
  id: string;
  event_id: string;
  exhibitor_id: string | null;
  email: string | null;
  enabled: boolean;
}

interface Event {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface Exhibitor {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
}

const POWER_OPTIONS = [
  { value: 'NONE', label: 'Geen stroom' },
  { value: 'WATT_500', label: '500W' },
  { value: 'WATT_2000', label: '2kW' },
  { value: 'WATT_3500', label: '3.5kW' },
  { value: 'AMP_16A', label: '16A' },
  { value: 'AMP_32A', label: '32A' },
];

const SURFACE_OPTIONS = [
  { value: 'EMPTY', label: 'Kale vloer' },
  { value: 'EMPTY_WITH_CARPET', label: 'Met tapijt' },
  { value: 'WITH_CONSTRUCTION', label: 'Met standbouw' },
];

export default function ExhibitorPortal() {
  const { token } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalToken, setPortalToken] = useState<PortalToken | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [exhibitor, setExhibitor] = useState<Exhibitor | null>(null);

  const [formData, setFormData] = useState({
    power_option: 'NONE',
    water_connections: 0,
    light_points: 0,
    surface_type: 'EMPTY',
    construction_booked: false,
    carpet_included: false,
    notes: '',
  });

  useEffect(() => {
    fetchPortalData();
  }, [token]);

  const fetchPortalData = async () => {
    if (!token) {
      setError('Geen portal token gevonden');
      setLoading(false);
      return;
    }

    try {
      // Fetch portal token
      const { data: tokenData, error: tokenError } = await supabase
        .from('exhibitor_portal_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        setError('Ongeldige of verlopen link');
        setLoading(false);
        return;
      }

      if (!tokenData.enabled) {
        setError('Deze portal link is uitgeschakeld');
        setLoading(false);
        return;
      }

      setPortalToken(tokenData as PortalToken);

      // Fetch event info
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name, location, start_date, end_date')
        .eq('id', tokenData.event_id)
        .single();

      if (eventData) {
        setEvent(eventData as Event);
      }

      // Fetch exhibitor if linked
      if (tokenData.exhibitor_id) {
        const { data: exhibitorData } = await supabase
          .from('exhibitors')
          .select('id, name, contact_name, email')
          .eq('id', tokenData.exhibitor_id)
          .single();

        if (exhibitorData) {
          setExhibitor(exhibitorData as Exhibitor);

          // Load existing services
          const { data: servicesData } = await supabase
            .from('exhibitor_services')
            .select('*')
            .eq('exhibitor_id', tokenData.exhibitor_id)
            .single();

          if (servicesData) {
            setFormData({
              power_option: servicesData.power_option || 'NONE',
              water_connections: servicesData.water_connections || 0,
              light_points: servicesData.light_points || 0,
              surface_type: servicesData.surface_type || 'EMPTY',
              construction_booked: servicesData.construction_booked || false,
              carpet_included: servicesData.carpet_included || false,
              notes: servicesData.notes || '',
            });
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalToken || !exhibitor) return;

    setSubmitting(true);

    try {
      // Upsert exhibitor services
      const { error: upsertError } = await supabase
        .from('exhibitor_services')
        .upsert({
          exhibitor_id: exhibitor.id,
          power_option: formData.power_option as any,
          water_connections: formData.water_connections,
          light_points: formData.light_points,
          surface_type: formData.surface_type as any,
          construction_booked: formData.construction_booked,
          carpet_included: formData.carpet_included,
          notes: formData.notes || null,
        }, {
          onConflict: 'exhibitor_id',
        });

      if (upsertError) throw upsertError;

      setSubmitted(true);
      toast({
        title: 'Opgeslagen!',
        description: 'Je services zijn bijgewerkt',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Link ongeldig</CardTitle>
            <CardDescription className="mt-2">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Neem contact op met de organisator voor een nieuwe link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Bedankt!</CardTitle>
            <CardDescription className="mt-2">
              Je services zijn opgeslagen. De organisator zal je aanvraag verwerken.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setSubmitted(false)} variant="outline" className="w-full">
              Terug naar formulier
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Event Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>{event?.name || 'Evenement'}</CardTitle>
                {event?.location && (
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          {event?.start_date && (
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(event.start_date), 'd MMMM yyyy', { locale: nl })}
                  {event.end_date && event.end_date !== event.start_date && (
                    <> - {format(new Date(event.end_date), 'd MMMM yyyy', { locale: nl })}</>
                  )}
                </span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Exhibitor Info */}
        {exhibitor && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">{exhibitor.name}</CardTitle>
                  {exhibitor.contact_name && (
                    <CardDescription>{exhibitor.contact_name}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Services Form */}
        <Card>
          <CardHeader>
            <CardTitle>Services aanvragen</CardTitle>
            <CardDescription>
              Geef hieronder aan welke services je nodig hebt voor je stand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Power */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Stroomaansluiting
                </Label>
                <Select
                  value={formData.power_option}
                  onValueChange={(value) => setFormData({ ...formData, power_option: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POWER_OPTIONS.map((opt) => (
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
                  <Droplets className="w-4 h-4" />
                  Wateraansluitingen
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={formData.water_connections}
                  onChange={(e) => setFormData({ ...formData, water_connections: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Light points */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Extra lichtpunten
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={formData.light_points}
                  onChange={(e) => setFormData({ ...formData, light_points: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Surface type */}
              <div className="space-y-2">
                <Label>Standoppervlak</Label>
                <Select
                  value={formData.surface_type}
                  onValueChange={(value) => setFormData({ ...formData, surface_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="construction"
                    checked={formData.construction_booked}
                    onCheckedChange={(checked) => setFormData({ ...formData, construction_booked: !!checked })}
                  />
                  <Label htmlFor="construction" className="cursor-pointer">
                    Standbouw via organisatie
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="carpet"
                    checked={formData.carpet_included}
                    onCheckedChange={(checked) => setFormData({ ...formData, carpet_included: !!checked })}
                  />
                  <Label htmlFor="carpet" className="cursor-pointer">
                    Tapijt inclusief
                  </Label>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Opmerkingen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Bijzondere wensen of opmerkingen..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !exhibitor}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Opslaan
              </Button>

              {!exhibitor && (
                <p className="text-sm text-muted-foreground text-center">
                  Je kunt dit formulier invullen zodra je gekoppeld bent aan een exposant.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
