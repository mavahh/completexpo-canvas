import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface BookingVelocityProps {
  eventId?: string | null;
}

export function BookingVelocityChart({ eventId }: BookingVelocityProps) {
  const [data, setData] = useState<Array<{ month: string; bookings: number }>>([]);
  const [period, setPeriod] = useState('6months');

  useEffect(() => {
    fetchBookingData();
  }, [eventId, period]);

  const fetchBookingData = async () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const periodMonths = period === '30days' ? 1 : period === '3months' ? 3 : period === '1year' ? 12 : 6;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    let query = supabase
      .from('stands')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data: standsData } = await query;

    if (standsData) {
      const monthlyData: Record<string, number> = {};
      
      for (let i = periodMonths - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = months[d.getMonth()];
        monthlyData[key] = 0;
      }

      standsData.forEach((stand) => {
        const date = new Date(stand.created_at);
        const key = months[date.getMonth()];
        if (key in monthlyData) {
          monthlyData[key]++;
        }
      });

      setData(Object.entries(monthlyData).map(([month, bookings]) => ({ month, bookings })));
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Boekingssnelheid</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Selecteer periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30days">Laatste 30 dagen</SelectItem>
            <SelectItem value="3months">Laatste 3 maanden</SelectItem>
            <SelectItem value="6months">Laatste 6 maanden</SelectItem>
            <SelectItem value="1year">Laatste jaar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="hsl(var(--border))"
            />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Area
              type="monotone"
              dataKey="bookings"
              stroke="hsl(24, 95%, 53%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBookings)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
