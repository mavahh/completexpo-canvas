import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/dashboard/KPICard';
import { EventCard } from '@/components/dashboard/EventCard';
import { BookingVelocityChart } from '@/components/dashboard/BookingVelocityChart';
import { StandDistributionChart } from '@/components/dashboard/StandDistributionChart';
import type { AppEventBasic as Event, StandStats } from '@/types';
import { Plus, Users, LayoutGrid, Euro, ShoppingCart } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { eventId } = useCurrentEvent();
  const [events, setEvents] = useState<Event[]>([]);
  const [exhibitorCounts, setExhibitorCounts] = useState<Record<string, number>>({});
  const [totalExhibitors, setTotalExhibitors] = useState(0);
  const [standStats, setStandStats] = useState<StandStats>({
    available: 0,
    reserved: 0,
    sold: 0,
    blocked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user, eventId]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch events (filtered if eventId is set)
    let eventsQuery = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (eventId) {
      eventsQuery = eventsQuery.eq('id', eventId);
    }
    
    const { data: eventsData } = await eventsQuery;

    if (eventsData) {
      setEvents(eventsData);

      // Fetch exhibitor counts per event
      const counts: Record<string, number> = {};
      let total = 0;
      
      for (const event of eventsData) {
        const { count } = await supabase
          .from('exhibitors')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        
        counts[event.id] = count || 0;
        total += count || 0;
      }
      
      setExhibitorCounts(counts);
      setTotalExhibitors(total);
    }

    // Fetch stand statistics (filtered if eventId is set)
    let standsQuery = supabase.from('stands').select('status, event_id');
    
    if (eventId) {
      standsQuery = standsQuery.eq('event_id', eventId);
    }
    
    const { data: standsData } = await standsQuery;

    if (standsData) {
      const stats: StandStats = {
        available: 0,
        reserved: 0,
        sold: 0,
        blocked: 0,
      };

      standsData.forEach((stand) => {
        const status = (stand.status as string || 'AVAILABLE').toLowerCase() as keyof StandStats;
        if (status in stats) {
          stats[status]++;
        } else {
          stats.available++;
        }
      });

      setStandStats(stats);
    }

    setLoading(false);
  };

  const totalStands = Object.values(standStats).reduce((a, b) => a + b, 0);
  const soldPercentage = totalStands > 0 
    ? Math.round(((standStats.sold + standStats.reserved) / totalStands) * 100) 
    : 0;

  const getEventStatus = (event: Event): 'active' | 'draft' | 'completed' => {
    if (!event.start_date) return 'draft';
    const now = new Date();
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : start;
    
    if (now > end) return 'completed';
    if (now >= start && now <= end) return 'active';
    return 'draft';
  };

  const gradients = [
    'from-orange-400 to-amber-500',
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-muted rounded-xl" />
          <div className="h-80 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Exhibitors"
          value={totalExhibitors.toLocaleString()}
          subtitle={eventId ? "This event" : "All events"}
          icon={Users}
          trend={{ value: 12.5, isPositive: true }}
        />
        <KPICard
          title="Floor Space Sold"
          value={`${soldPercentage}%`}
          subtitle={`${totalStands.toLocaleString()} stands total`}
          icon={LayoutGrid}
          trend={{ value: 4.2, isPositive: true }}
        />
        <KPICard
          title="Total Revenue"
          value="€4.2M"
          subtitle="Gross income"
          icon={Euro}
          trend={{ value: 8.1, isPositive: true }}
        />
        <KPICard
          title="Pending Orders"
          value={standStats.reserved}
          subtitle="Requires attention"
          icon={ShoppingCart}
          trend={{ value: 2.4, isPositive: false }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BookingVelocityChart eventId={eventId} />
        </div>
        <StandDistributionChart data={standStats} />
      </div>

      {/* Events Section - only show when no specific event is selected */}
      {!eventId && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Events</h2>
            <Link to="/events/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                New Event
              </Button>
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground mb-4">No events yet</p>
              <Link to="/events/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first event
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.slice(0, 6).map((event, index) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  name={event.name}
                  startDate={event.start_date}
                  endDate={event.end_date}
                  location={event.location}
                  exhibitorCount={exhibitorCounts[event.id] || 0}
                  status={getEventStatus(event)}
                  gradient={gradients[index % gradients.length]}
                />
              ))}
            </div>
          )}

          {events.length > 6 && (
            <div className="text-center mt-4">
              <Link to="/events">
                <Button variant="outline">View all events</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
