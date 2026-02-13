import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { HallSelector } from '@/components/events/HallSelector';

export default function EventForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [form, setForm] = useState({
    name: '',
    location: '',
    start_date: '',
    end_date: '',
    hall_id: null as string | null,
  });

  useEffect(() => {
    if (isEdit) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: 'Evenement niet gevonden',
      });
      navigate('/events');
      return;
    }

    setForm({
      name: data.name,
      location: data.location || '',
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      hall_id: (data as any).hall_id || null,
    });
    setFetching(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('events')
          .update({
            name: form.name,
            location: form.location || null,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            hall_id: form.hall_id || null,
          })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Opgeslagen',
          description: 'Evenement is bijgewerkt',
        });
        navigate(`/events/${id}`);
      } else {
        // Create event using RPC function that handles membership + floorplan in one transaction
        const { data: event, error: eventError } = await supabase
          .rpc('create_event_with_defaults', {
            _name: form.name,
            _location: form.location || '',
            _start_date: form.start_date || null,
            _end_date: form.end_date || null,
          });

        if (eventError || !event) throw eventError;

        toast({
          title: 'Aangemaakt',
          description: 'Evenement is aangemaakt',
        });
        navigate(`/events/${event.id}`);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message || 'Er is iets misgegaan',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate(isEdit ? `/events/${id}` : '/events')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Terug
      </Button>

      <Card className="p-6">
        <h1 className="text-xl font-bold text-foreground mb-6">
          {isEdit ? 'Evenement bewerken' : 'Nieuw evenement'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Naam van het evenement"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Locatie</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Bijv. RAI Amsterdam"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Startdatum</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Einddatum</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Hall Selection */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-base font-semibold">Hal selectie</Label>
            <p className="text-sm text-muted-foreground mb-2">Koppel dit evenement aan een hal voor schaalgetrouwe plattegronden.</p>
            <HallSelector
              value={form.hall_id}
              onChange={(hallId) => setForm({ ...form, hall_id: hallId })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Opslaan' : 'Aanmaken'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEdit ? `/events/${id}` : '/events')}
            >
              Annuleren
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
