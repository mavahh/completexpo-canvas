import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Layout, 
  Users, 
  FileText, 
  ShoppingCart, 
  MessageSquare, 
  Handshake,
  Settings,
  UserCog,
  CreditCard,
  ArrowLeft,
  Loader2,
  Calendar,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Event {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
}

const tiles = [
  { id: 'handbook', label: 'Handboek', icon: FileText, disabled: true },
  { id: 'floorplan', label: 'Plattegrond', icon: Layout, path: 'floorplan' },
  { id: 'orders', label: 'Bestellingen', icon: ShoppingCart, disabled: true },
  { id: 'exhibitors', label: 'Exposanten', icon: Users, path: 'exhibitors' },
  { id: 'messages', label: 'Berichten', icon: MessageSquare, disabled: true },
  { id: 'partnerships', label: 'Partners', icon: Handshake, disabled: true },
  { id: 'settings', label: 'Instellingen', icon: Settings, disabled: true },
  { id: 'users', label: 'Gebruikers', icon: UserCog, disabled: true },
  { id: 'credits', label: 'Credits', icon: CreditCard, disabled: true },
];

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      navigate('/events');
      return;
    }

    setEvent(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate('/events')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Terug naar evenementen
      </Button>

      {/* Event header */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{event.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              {event.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(event.start_date), 'd MMMM yyyy', { locale: nl })}
                  {event.end_date && ` - ${format(new Date(event.end_date), 'd MMMM yyyy', { locale: nl })}`}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
          <Link to={`/events/${id}/edit`}>
            <Button variant="outline" size="sm">
              Bewerken
            </Button>
          </Link>
        </div>
      </div>

      {/* Tiles grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          
          if (tile.disabled) {
            return (
              <div
                key={tile.id}
                className="tile-card opacity-50 cursor-not-allowed"
              >
                <Icon className="tile-card-icon" />
                <span className="tile-card-title">{tile.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={tile.id}
              to={`/events/${id}/${tile.path}`}
              className="tile-card"
            >
              <Icon className="tile-card-icon" />
              <span className="tile-card-title">{tile.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
