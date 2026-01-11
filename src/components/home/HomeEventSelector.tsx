import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Event {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface HomeEventSelectorProps {
  selectedEventId: string | null;
  onEventChange: (eventId: string | null, eventName?: string, eventLocation?: string | null) => void;
}

export function HomeEventSelector({ selectedEventId, onEventChange }: HomeEventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Auto-select if only one event
  useEffect(() => {
    if (!loading && events.length === 1 && !selectedEventId) {
      const event = events[0];
      onEventChange(event.id, event.name, event.location);
    }
  }, [events, loading, selectedEventId, onEventChange]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, name, location, start_date, end_date')
      .order('start_date', { ascending: false });

    if (data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return null;
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    if (endDate) {
      return `${startDate.toLocaleDateString('nl-BE', options)} - ${endDate.toLocaleDateString('nl-BE', options)}`;
    }
    return startDate.toLocaleDateString('nl-BE', options);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Huidig event</p>
              {selectedEvent ? (
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{selectedEvent.name}</p>
                  {selectedEvent.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {selectedEvent.location}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Geen event geselecteerd</p>
              )}
              {selectedEvent && (
                <p className="text-xs text-muted-foreground">
                  {formatDateRange(selectedEvent.start_date, selectedEvent.end_date)}
                </p>
              )}
            </div>
          </div>
          
          <Select
            value={selectedEventId || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                onEventChange(null);
              } else {
                const event = events.find(e => e.id === value);
                onEventChange(value, event?.name, event?.location);
              }
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecteer event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Geen selectie</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
