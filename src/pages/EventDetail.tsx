import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  MapPin,
  LayoutGrid
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

interface Stats {
  exhibitors: number;
  stands: number;
  floorplans: number;
}

const tiles = [
  { id: 'handbook', label: 'Handboek', icon: FileText, description: 'Documentatie en richtlijnen', disabled: true },
  { id: 'floorplan', label: 'Plattegrond', icon: Layout, path: 'floorplan', description: 'Beheer hal layouts' },
  { id: 'orders', label: 'Bestellingen', icon: ShoppingCart, description: 'Exposant bestellingen', disabled: true },
  { id: 'exhibitors', label: 'Exposanten', icon: Users, path: 'exhibitors', description: 'Beheer deelnemers' },
  { id: 'messages', label: 'Berichten', icon: MessageSquare, description: 'Communicatie', disabled: true },
  { id: 'partnerships', label: 'Partners', icon: Handshake, description: 'Partnerbeheer', disabled: true },
  { id: 'settings', label: 'Instellingen', icon: Settings, description: 'Event configuratie', disabled: true },
  { id: 'users', label: 'Gebruikers', icon: UserCog, description: 'Teambeheer', disabled: true },
  { id: 'credits', label: 'Credits', icon: CreditCard, description: 'Facturatie', disabled: true },
];

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<Stats>({ exhibitors: 0, stands: 0, floorplans: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;

    // Fetch event
    const { data: eventData, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !eventData) {
      navigate('/events');
      return;
    }

    setEvent(eventData);

    // Fetch stats in parallel
    const [exhibitorsRes, standsRes, floorplansRes] = await Promise.all([
      supabase.from('exhibitors').select('id', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('stands').select('id', { count: 'exact', head: true }).eq('event_id', id),
      supabase.from('floorplans').select('id', { count: 'exact', head: true }).eq('event_id', id),
    ]);

    setStats({
      exhibitors: exhibitorsRes.count || 0,
      stands: standsRes.count || 0,
      floorplans: floorplansRes.count || 0,
    });

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
    <div className="max-w-6xl mx-auto animate-fade-in">
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

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.exhibitors}</p>
              <p className="text-xs text-muted-foreground">Exposanten</p>
            </div>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.stands}</p>
              <p className="text-xs text-muted-foreground">Stands</p>
            </div>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Layout className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.floorplans}</p>
              <p className="text-xs text-muted-foreground">Hallen</p>
            </div>
          </div>
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
                className="bg-card border border-border rounded-lg p-5 opacity-50 cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{tile.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">Binnenkort</Badge>
                  </div>
                </div>
              </div>
            );
          }

          // Get badge count for active tiles
          let badgeCount = 0;
          if (tile.id === 'exhibitors') badgeCount = stats.exhibitors;
          if (tile.id === 'floorplan') badgeCount = stats.floorplans;

          return (
            <Link
              key={tile.id}
              to={`/events/${id}/${tile.path}`}
              className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {tile.label}
                    </h3>
                    {badgeCount > 0 && (
                      <Badge variant="secondary" className="text-xs">{badgeCount}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
