import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { z } from 'zod';

const requestSchema = z.object({
  company_name: z.string().min(2, 'Bedrijfsnaam is verplicht').max(100),
  contact_name: z.string().min(2, 'Contactpersoon is verplicht').max(100),
  email: z.string().email('Ongeldig e-mailadres').max(255),
  phone: z.string().max(50).optional(),
  vat: z.string().max(50).optional(),
  requested_stand_label: z.string().max(20).optional(),
  requested_area: z.number().positive().optional().nullable(),
  requested_width: z.number().positive().optional().nullable(),
  requested_height: z.number().positive().optional().nullable(),
  power_option: z.string(),
  water_connections: z.number().min(0).max(10),
  light_points: z.number().min(0).max(50),
  construction_booked: z.boolean(),
  carpet_included: z.boolean(),
  surface_type: z.string(),
  notes: z.string().max(1000).optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

export default function PublicRequest() {
  const { token } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>('');
  const [invalid, setInvalid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<RequestForm>({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    vat: '',
    requested_stand_label: '',
    requested_area: null,
    requested_width: null,
    requested_height: null,
    power_option: 'NONE',
    water_connections: 0,
    light_points: 0,
    construction_booked: false,
    carpet_included: false,
    surface_type: 'EMPTY',
    notes: '',
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setInvalid(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, public_requests_enabled')
        .eq('public_request_token', token)
        .single();

      if (error || !data || !data.public_requests_enabled) {
        setInvalid(true);
      } else {
        setEventId(data.id);
        setEventName(data.name);
      }
    } catch {
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = requestSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!eventId) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('stand_requests').insert([{
        event_id: eventId,
        company_name: form.company_name,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone || null,
        vat: form.vat || null,
        requested_stand_label: form.requested_stand_label || null,
        requested_area: form.requested_area,
        requested_width: form.requested_width,
        requested_height: form.requested_height,
        power_option: form.power_option as any,
        water_connections: form.water_connections,
        light_points: form.light_points,
        construction_booked: form.construction_booked,
        carpet_included: form.carpet_included,
        surface_type: form.surface_type as any,
        notes: form.notes || null,
        status: 'NEW' as const,
      }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof RequestForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Ongeldige link</h1>
            <p className="text-muted-foreground">
              Deze aanvraaglink is ongeldig of niet meer actief.
              Neem contact op met de organisator voor een geldige link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Aanvraag verzonden!</h1>
            <p className="text-muted-foreground">
              Uw standaanvraag voor <strong>{eventName}</strong> is succesvol ingediend.
              U ontvangt bericht zodra uw aanvraag is verwerkt.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-2 text-primary mb-2">
              <Building2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Standaanvraag</CardTitle>
            <CardDescription className="text-lg">{eventName}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">Bedrijfsgegevens</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Bedrijfsnaam *</Label>
                    <Input
                      id="company_name"
                      value={form.company_name}
                      onChange={(e) => updateField('company_name', e.target.value)}
                      className={errors.company_name ? 'border-destructive' : ''}
                    />
                    {errors.company_name && (
                      <p className="text-sm text-destructive">{errors.company_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vat">BTW-nummer</Label>
                    <Input
                      id="vat"
                      value={form.vat || ''}
                      onChange={(e) => updateField('vat', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contactpersoon *</Label>
                    <Input
                      id="contact_name"
                      value={form.contact_name}
                      onChange={(e) => updateField('contact_name', e.target.value)}
                      className={errors.contact_name ? 'border-destructive' : ''}
                    />
                    {errors.contact_name && (
                      <p className="text-sm text-destructive">{errors.contact_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="phone">Telefoon</Label>
                    <Input
                      id="phone"
                      value={form.phone || ''}
                      onChange={(e) => updateField('phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Stand Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">Gewenste stand</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requested_stand_label">Standnummer (indien bekend)</Label>
                    <Input
                      id="requested_stand_label"
                      placeholder="bv. A12"
                      value={form.requested_stand_label || ''}
                      onChange={(e) => updateField('requested_stand_label', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requested_area">Gewenste oppervlakte (m²)</Label>
                    <Input
                      id="requested_area"
                      type="number"
                      min="0"
                      value={form.requested_area || ''}
                      onChange={(e) => updateField('requested_area', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Of afmetingen (m)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="B"
                        value={form.requested_width || ''}
                        onChange={(e) => updateField('requested_width', e.target.value ? Number(e.target.value) : null)}
                      />
                      <span className="self-center">×</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="D"
                        value={form.requested_height || ''}
                        onChange={(e) => updateField('requested_height', e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">Opties & Services</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stroom</Label>
                    <Select
                      value={form.power_option}
                      onValueChange={(v) => updateField('power_option', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Geen</SelectItem>
                        <SelectItem value="WATT_500">500 Watt</SelectItem>
                        <SelectItem value="WATT_2000">2000 Watt</SelectItem>
                        <SelectItem value="WATT_3500">3500 Watt</SelectItem>
                        <SelectItem value="AMP_16A">16A</SelectItem>
                        <SelectItem value="AMP_32A">32A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="water_connections">Wateraansluitingen</Label>
                    <Input
                      id="water_connections"
                      type="number"
                      min="0"
                      max="10"
                      value={form.water_connections}
                      onChange={(e) => updateField('water_connections', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="light_points">Lichtpunten</Label>
                    <Input
                      id="light_points"
                      type="number"
                      min="0"
                      max="50"
                      value={form.light_points}
                      onChange={(e) => updateField('light_points', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Oppervlak type</Label>
                    <Select
                      value={form.surface_type}
                      onValueChange={(v) => updateField('surface_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPTY">Leeg</SelectItem>
                        <SelectItem value="EMPTY_WITH_CARPET">Met tapijt</SelectItem>
                        <SelectItem value="WITH_CONSTRUCTION">Met standbouw</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="construction_booked"
                      checked={form.construction_booked}
                      onCheckedChange={(v) => updateField('construction_booked', !!v)}
                    />
                    <Label htmlFor="construction_booked" className="cursor-pointer">
                      Standbouw boeken
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="carpet_included"
                      checked={form.carpet_included}
                      onCheckedChange={(v) => updateField('carpet_included', !!v)}
                    />
                    <Label htmlFor="carpet_included" className="cursor-pointer">
                      Tapijt inbegrepen
                    </Label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Opmerkingen</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={form.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Eventuele opmerkingen of speciale wensen..."
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aanvraag indienen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
