import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Calendar, MapPin, ChevronRight, Newspaper, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Event {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  const newsItems = [
    { id: 1, title: 'Nieuwe functie: Stand notities', date: '2024-01-15' },
    { id: 2, title: 'Update: Verbeterde export opties', date: '2024-01-10' },
    { id: 3, title: 'Tips voor efficiënt plattegrondbeheer', date: '2024-01-05' },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Events */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Mijn evenementen</h2>
              <Link to="/events/new">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nieuw evenement
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nog geen evenementen</p>
                <Link to="/events/new">
                  <Button variant="outline" className="mt-4">
                    Maak je eerste evenement
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {event.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {event.start_date && (
                            <span>
                              {format(new Date(event.start_date), 'd MMM yyyy', { locale: nl })}
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            )}

            {events.length > 5 && (
              <Link to="/events" className="block mt-4">
                <Button variant="ghost" className="w-full">
                  Bekijk alle evenementen
                </Button>
              </Link>
            )}
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/events/new" className="tile-card">
              <Plus className="tile-card-icon" />
              <span className="tile-card-title">Nieuw evenement</span>
            </Link>
            <Link to="/events" className="tile-card">
              <Calendar className="tile-card-icon" />
              <span className="tile-card-title">Alle evenementen</span>
            </Link>
            <div className="tile-card opacity-50 cursor-not-allowed">
              <Bell className="tile-card-icon" />
              <span className="tile-card-title">Notificaties</span>
            </div>
            <div className="tile-card opacity-50 cursor-not-allowed">
              <Newspaper className="tile-card-icon" />
              <span className="tile-card-title">Rapporten</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* News */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Nieuws</h2>
            <div className="space-y-4">
              {newsItems.map((item) => (
                <div key={item.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                  <h3 className="text-sm font-medium text-foreground hover:text-primary cursor-pointer transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(item.date), 'd MMMM yyyy', { locale: nl })}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Help */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h2 className="text-lg font-semibold text-foreground mb-2">Hulp nodig?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Bekijk onze handleiding of neem contact op met support.
            </p>
            <Button variant="outline" size="sm">
              Bekijk handleiding
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
