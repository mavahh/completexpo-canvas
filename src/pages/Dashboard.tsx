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
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [posRevenue, setPosRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Price per m² for stand revenue calculation
  const PRICE_PER_SQM = 150;

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

    // Fetch stand statistics with dimensions (filtered if eventId is set)
    let standsQuery = supabase.from('stands').select('status, event_id, width, height');
    
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

      let soldArea = 0;

      standsData.forEach((stand) => {
        const status = (stand.status as string || 'AVAILABLE').toLowerCase() as keyof StandStats;
        if (status in stats) {
          stats[status]++;
        } else {
          stats.available++;
        }
        
        // Calculate revenue for sold stands (width/height are in pixels, assume 1px = 0.01m for display)
        if (status === 'sold') {
          const areaM2 = (stand.width * stand.height) / 10000; // Convert to m²
          soldArea += areaM2;
        }
      });

      setStandStats(stats);
      setTotalRevenue(soldArea * PRICE_PER_SQM);
    }

    // Fetch POS revenue
    let posQuery = supabase
      .from('pos_sales')
      .select('total_cents')
      .eq('status', 'COMPLETED');
    
    if (eventId) {
      posQuery = posQuery.eq('event_id', eventId);
    }
    
    const { data: posData } = await posQuery;
    
    if (posData) {
      const posTotal = posData.reduce((sum, sale) => sum + (sale.total_cents || 0), 0) / 100;
      setPosRevenue(posTotal);
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
          title="Totaal Exposanten"
          value={totalExhibitors.toLocaleString()}
          subtitle={eventId ? "Dit evenement" : "Alle evenementen"}
          icon={Users}
          trend={{ value: 12.5, isPositive: true }}
        />
        <KPICard
          title="Standruimte Verkocht"
          value={`${soldPercentage}%`}
          subtitle={`${totalStands.toLocaleString()} stands totaal`}
          icon={LayoutGrid}
          trend={{ value: 4.2, isPositive: true }}
        />
        <KPICard
          title="Totale Omzet"
          value={`€${((totalRevenue + posRevenue) / 1000).toFixed(1)}K`}
          subtitle={`Standruimte: €${totalRevenue.toLocaleString('nl-NL')} | POS: €${posRevenue.toLocaleString('nl-NL')}`}
          icon={Euro}
          trend={{ value: 8.1, isPositive: true }}
        />
        <KPICard
          title="Openstaande Reserveringen"
          value={standStats.reserved}
          subtitle="Vereist aandacht"
          icon={ShoppingCart}
          trend={{ value: 2.4, isPositive: false }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <BookingVelocityChart eventId={eventId} />
        </div>
        <StandDistributionChart data={standStats} />
      </div>

      {/* Events Section - only show when no specific event is selected */}
      {!eventId && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Jouw Evenementen</h2>
            <Link to="/events/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Nieuw Evenement
              </Button>
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground mb-4">Nog geen evenementen</p>
              <Link to="/events/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Maak je eerste evenement
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
                <Button variant="outline">Bekijk alle evenementen</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
