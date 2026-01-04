import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Calendar, MapPin, Search, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Event {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  created_at: string;
}

export default function Events() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: 'Kon evenement niet verwijderen',
      });
    } else {
      toast({
        title: 'Verwijderd',
        description: 'Evenement is verwijderd',
      });
      fetchEvents();
    }
    setDeleteId(null);
  };

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(search.toLowerCase()) ||
    event.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evenementen</h1>
          <p className="text-muted-foreground">Beheer al je beurzen en exposities</p>
        </div>
        <Link to="/events/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nieuw evenement
          </Button>
        </Link>
      </div>

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek evenementen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">Geen evenementen gevonden</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Probeer een andere zoekopdracht' : 'Maak je eerste evenement aan'}
          </p>
          {!search && (
            <Link to="/events/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nieuw evenement
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className="p-4 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{event.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {event.start_date && (
                        <span>
                          {format(new Date(event.start_date), 'd MMM yyyy', { locale: nl })}
                          {event.end_date && ` - ${format(new Date(event.end_date), 'd MMM yyyy', { locale: nl })}`}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/events/${event.id}/edit`);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(event.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Evenement verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Alle gegevens van dit evenement worden permanent verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
