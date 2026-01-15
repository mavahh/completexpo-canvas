import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePosPermissions } from '@/hooks/usePosPermissions';
import { usePosRegisters } from '@/hooks/usePosData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCents, VAT_RATE_LABELS } from '@/types/pos';
import type { VatRate } from '@/types/pos';
import { format } from 'date-fns';

export default function PosReports() {
  const { id: eventId } = useParams<{ id: string }>();
  const { loading: permLoading, canAdmin } = usePosPermissions(eventId || null);
  const { registers, loading: regLoading } = usePosRegisters(eventId || null);
  
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [registerId, setRegisterId] = useState<string>('all');
  
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalSales: number;
    totalAmount: number;
    byPayment: Record<string, number>;
    byVat: Record<VatRate, { base: number; vat: number }>;
    topProducts: { name: string; qty: number; revenue: number }[];
  } | null>(null);

  const fetchStats = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      let salesQuery = supabase
        .from('pos_sales')
        .select('*, items:pos_sale_items(*)')
        .eq('event_id', eventId)
        .eq('status', 'COMPLETED')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`);

      if (registerId !== 'all') {
        salesQuery = salesQuery.eq('register_id', registerId);
      }

      const { data: sales, error } = await salesQuery;
      if (error) throw error;

      const byPayment: Record<string, number> = { CASH: 0, CARD: 0, OTHER: 0 };
      const byVat: Record<VatRate, { base: number; vat: number }> = {
        VAT_0: { base: 0, vat: 0 },
        VAT_6: { base: 0, vat: 0 },
        VAT_12: { base: 0, vat: 0 },
        VAT_21: { base: 0, vat: 0 },
      };
      const productMap = new Map<string, { qty: number; revenue: number }>();

      let totalAmount = 0;

      sales?.forEach(sale => {
        totalAmount += sale.total_cents;
        byPayment[sale.payment_method] = (byPayment[sale.payment_method] || 0) + sale.total_cents;

        (sale.items as any[])?.forEach(item => {
          const lineTotal = item.line_total_cents;
          const rate = item.vat_rate_snapshot as VatRate;
          const vatPercent = { VAT_0: 0, VAT_6: 6, VAT_12: 12, VAT_21: 21 }[rate] || 0;
          const vatAmount = Math.round(lineTotal - (lineTotal / (1 + vatPercent / 100)));
          
          byVat[rate].vat += vatAmount;
          byVat[rate].base += lineTotal - vatAmount;

          const existing = productMap.get(item.name_snapshot) || { qty: 0, revenue: 0 };
          productMap.set(item.name_snapshot, {
            qty: existing.qty + item.qty,
            revenue: existing.revenue + lineTotal,
          });
        });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setStats({
        totalSales: sales?.length || 0,
        totalAmount,
        byPayment,
        byVat,
        topProducts,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId && canAdmin) {
      fetchStats();
    }
  }, [eventId, dateFrom, dateTo, registerId, canAdmin]);

  const isLoading = permLoading || regLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!canAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Je hebt geen toegang tot rapporten.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">POS Rapporten</h1>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div>
              <Label>Van</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Tot</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Kassa</Label>
              <Select value={registerId} onValueChange={setRegisterId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle kassa's</SelectItem>
                  {registers.map(reg => (
                    <SelectItem key={reg.id} value={reg.id}>{reg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-[300px]" />
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Totals */}
          <Card>
            <CardHeader><CardTitle>Totalen</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Aantal verkopen</span>
                <span className="font-bold">{stats.totalSales}</span>
              </div>
              <div className="flex justify-between">
                <span>Totaal omzet</span>
                <span className="font-bold text-primary">{formatCents(stats.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* By Payment */}
          <Card>
            <CardHeader><CardTitle>Per betaalmethode</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between"><span>Cash</span><span>{formatCents(stats.byPayment.CASH)}</span></div>
              <div className="flex justify-between"><span>Kaart</span><span>{formatCents(stats.byPayment.CARD)}</span></div>
              <div className="flex justify-between"><span>Overig</span><span>{formatCents(stats.byPayment.OTHER)}</span></div>
            </CardContent>
          </Card>

          {/* By VAT */}
          <Card>
            <CardHeader><CardTitle>BTW Overzicht</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(stats.byVat).filter(([_, v]) => v.vat > 0).map(([rate, v]) => (
                <div key={rate} className="flex justify-between">
                  <span>{VAT_RATE_LABELS[rate as VatRate]}</span>
                  <span>BTW: {formatCents(v.vat)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader><CardTitle>Top Producten</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topProducts.map((p, i) => (
                  <div key={p.name} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="font-medium">{i + 1}. {p.name}</span>
                    <div className="text-sm text-muted-foreground">
                      {p.qty}x • {formatCents(p.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
