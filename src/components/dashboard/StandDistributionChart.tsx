import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/card';

interface StandDistributionProps {
  data: {
    available: number;
    reserved: number;
    sold: number;
    blocked: number;
  };
}

const COLORS = {
  available: 'hsl(199, 89%, 48%)', // info blue
  reserved: 'hsl(38, 92%, 50%)',   // warning yellow/orange
  sold: 'hsl(142, 76%, 36%)',      // success green
  blocked: 'hsl(220, 9%, 46%)',    // muted grey
};

export function StandDistributionChart({ data }: StandDistributionProps) {
  const total = data.available + data.reserved + data.sold + data.blocked;
  
  const chartData = [
    { name: 'Confirmed', value: data.sold, color: COLORS.sold },
    { name: 'Pending', value: data.reserved, color: COLORS.reserved },
    { name: 'Available', value: data.available, color: COLORS.available },
    { name: 'Blocked', value: data.blocked, color: COLORS.blocked },
  ].filter(item => item.value > 0);

  const getPercentage = (value: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-foreground mb-4">Stand Distribution</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-2 mt-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-foreground">{item.name}</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {getPercentage(item.value)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
