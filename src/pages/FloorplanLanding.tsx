/**
 * FloorplanLanding – simple landing page for the standalone floorplan editor.
 * Route: /floorplan
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';

interface EventWithHall {
  id: string;
  name: string;
  hall_id: string | null;
  hall_name?: string;
}

export default function FloorplanLanding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventWithHall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, hall_id')
        .order('name');

      if (data) {
        // Enrich with hall names
        const hallIds = data.filter(e => e.hall_id).map(e => e.hall_id!);
        const { data: halls } = hallIds.length > 0
          ? await supabase.from('halls').select('id, name').in('id', hallIds)
          : { data: [] };

        const hallMap = new Map((halls || []).map(h => [h.id, h.name]));

        setEvents(data.map(e => ({
          ...e,
          hall_name: e.hall_id ? hallMap.get(e.hall_id) || 'Onbekend' : undefined,
        })));
      }
      setLoading(false);
    };

    loadEvents();
  }, [user]);

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <h1 className="text-2xl font-bold text-foreground">CompleteExpo Floorplan Editor</h1>
        <p className="text-muted-foreground">Log in om de editor te openen.</p>
        <Button onClick={() => navigate('/login')}>Inloggen</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Floorplan Editor</h1>
        <p className="text-muted-foreground mb-6">Selecteer een event om de plattegrond te openen.</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-sm">Geen events gevonden.</p>
        ) : (
          <div className="grid gap-3">
            {events.map(event => (
              <Card
                key={event.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (event.hall_id) {
                    navigate(`/floorplan/event/${event.id}/hall/${event.hall_id}`);
                  }
                }}
              >
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.name}</p>
                    {event.hall_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {event.hall_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!event.hall_id}
                  >
                    {event.hall_id ? 'Open Editor' : 'Geen hal'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
