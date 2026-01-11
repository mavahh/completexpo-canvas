import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  location: string | null;
}

interface EventSelectorProps {
  selectedEventId: string | null;
  onEventChange: (eventId: string | null) => void;
}

export function EventSelector({ selectedEventId, onEventChange }: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, name, location')
      .order('start_date', { ascending: false });

    if (data) {
      setEvents(data);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select
        value={selectedEventId || 'all'}
        onValueChange={(value) => onEventChange(value === 'all' ? null : value)}
        disabled={loading}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Selecteer event" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle evenementen</SelectItem>
          {events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              {event.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
