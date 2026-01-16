import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, CircleDollarSign, Receipt, ArrowLeft, Printer, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePosCategories, usePosProducts, usePosShifts } from '@/hooks/usePosData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ReceiptPreview } from '@/components/pos/ReceiptPreview';
import type { CartItem, PaymentMethod, PosSale } from '@/types/pos';
import { formatCents, calculateCartTotals, VAT_RATE_LABELS } from '@/types/pos';

export default function PosKiosk() {
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const shiftId = searchParams.get('shift');
  
  const { categories, loading: catLoading } = usePosCategories(eventId || null);
  const { products, loading: prodLoading } = usePosProducts(eventId || null, true);
  const { shifts, loading: shiftLoading, refetch: refetchShifts } = usePosShifts(eventId || null);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  
  // Realtime connection status
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // Recent sales for this shift (realtime updated)
  const [recentSales, setRecentSales] = useState<PosSale[]>([]);

  // Find the current shift
  const currentShift = shifts.find(s => s.id === shiftId);
  const registerName = currentShift?.register?.name || 'Kassa';

  // Realtime subscription for sales and shift updates
  useEffect(() => {
    if (!shiftId || !eventId) return;

    const channel = supabase
      .channel(`pos-kiosk-${shiftId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pos_sales',
          filter: `shift_id=eq.${shiftId}`,
        },
        async (payload) => {
          console.log('Realtime sale update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch complete sale with items
            const { data: completeSale } = await supabase
              .from('pos_sales')
              .select('*, items:pos_sale_items(*)')
              .eq('id', (payload.new as any).id)
              .single();
            
            if (completeSale) {
              setRecentSales(prev => [completeSale as unknown as PosSale, ...prev.slice(0, 9)]);
              // Only show toast if it's not our own sale
              if ((payload.new as any).sold_by_user_id !== user?.id) {
                toast.info(`Nieuwe verkoop: ${formatCents((payload.new as any).total_cents)}`);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setRecentSales(prev => 
              prev.map(s => s.id === (payload.new as any).id 
                ? { ...s, ...(payload.new as any) } 
                : s
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pos_shifts',
          filter: `id=eq.${shiftId}`,
        },
        (payload) => {
          console.log('Realtime shift update:', payload);
          // Refetch shifts when the current shift is updated (e.g., closed)
          refetchShifts();
          
          if ((payload.new as any).status === 'CLOSED') {
            toast.warning('Deze shift is gesloten op een ander apparaat');
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    // Fetch initial recent sales
    const fetchRecentSales = async () => {
      const { data } = await supabase
        .from('pos_sales')
        .select('*, items:pos_sale_items(*)')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setRecentSales(data as unknown as PosSale[]);
      }
    };
    fetchRecentSales();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shiftId, eventId, user?.id, refetchShifts]);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategoryId || p.category_id === selectedCategoryId;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Cart functions
  const addToCart = (product: typeof products[0]) => {
    if (!currentShift || currentShift.status !== 'OPEN') return;
    
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => 
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        priceCents: product.price_cents,
        vatRate: product.vat_rate,
        qty: 1,
      }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId !== productId) return item;
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }).filter(item => item.qty > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const cartTotals = calculateCartTotals(cart);

  // Quick amount buttons for cash
  const quickAmounts = [5, 10, 20, 50].filter(a => a * 100 >= cartTotals.totalCents);

  // Checkout
  const handleCheckout = async () => {
    if (!eventId || !user || !currentShift || cart.length === 0) return;
    
    const cashReceivedNum = paymentMethod === 'CASH' ? Math.round(parseFloat(cashReceived || '0') * 100) : null;
    const changeGiven = paymentMethod === 'CASH' && cashReceivedNum 
      ? cashReceivedNum - cartTotals.totalCents 
      : null;

    if (paymentMethod === 'CASH' && (!cashReceivedNum || cashReceivedNum < cartTotals.totalCents)) {
      toast.error('Ontvangen bedrag is onvoldoende');
      return;
    }

    setProcessingCheckout(true);
    try {
      // Generate receipt number
      const { data: receiptNum, error: receiptError } = await supabase.rpc('generate_receipt_number', {
        _event_id: eventId,
      });
      if (receiptError) throw receiptError;

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('pos_sales')
        .insert({
          event_id: eventId,
          register_id: currentShift.register_id,
          shift_id: currentShift.id,
          sold_by_user_id: user.id,
          receipt_number: receiptNum,
          status: 'COMPLETED',
          payment_method: paymentMethod,
          subtotal_cents: cartTotals.subtotalCents,
          vat_cents: cartTotals.vatCents,
          total_cents: cartTotals.totalCents,
          cash_received_cents: cashReceivedNum,
          change_given_cents: changeGiven,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.productId,
        name_snapshot: item.name,
        price_cents_snapshot: item.priceCents,
        vat_rate_snapshot: item.vatRate,
        qty: item.qty,
        line_total_cents: item.priceCents * item.qty,
      }));

      const { error: itemsError } = await supabase
        .from('pos_sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Fetch complete sale with items
      const { data: completeSale } = await supabase
        .from('pos_sales')
        .select('*, items:pos_sale_items(*)')
        .eq('id', sale.id)
        .single();

      setLastSale(completeSale as unknown as PosSale);
      setShowCheckout(false);
      setShowReceipt(true);
      clearCart();
      setCashReceived('');
      toast.success('Verkoop voltooid!');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Fout bij afrekenen');
    } finally {
      setProcessingCheckout(false);
    }
  };

  // Loading state
  const isLoading = catLoading || prodLoading || shiftLoading;

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-32 w-32 rounded-lg" />
      </div>
    );
  }

  if (!currentShift) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">Shift niet gevonden of gesloten</p>
        <Button onClick={() => navigate(`/events/${eventId}/pos/shifts`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar shifts
        </Button>
      </div>
    );
  }

  if (currentShift.status !== 'OPEN') {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">Deze shift is gesloten</p>
        <Button onClick={() => navigate(`/events/${eventId}/pos/shifts`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar shifts
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar - minimal */}
      <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/events/${eventId}/pos/shifts`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">{registerName}</h1>
            <p className="text-xs text-muted-foreground">
              Shift actief • {recentSales.length} verkopen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={realtimeConnected ? "default" : "secondary"} 
            className="gap-2"
          >
            <Wifi className={cn("h-3 w-3", realtimeConnected ? "text-green-300" : "text-muted-foreground")} />
            {realtimeConnected ? 'Live' : 'Verbinden...'}
          </Badge>
          <Badge variant="default" className="gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            OPEN
          </Badge>
        </div>
      </div>

      {/* Main content - full height */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories - narrower on tablet */}
        <div className="w-32 md:w-40 border-r bg-muted/30 p-2 overflow-y-auto flex-shrink-0">
          <div className="space-y-1">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'ghost'}
              className="w-full justify-start text-sm h-12"
              onClick={() => setSelectedCategoryId(null)}
            >
              Alles
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? 'default' : 'ghost'}
                className="w-full justify-start text-sm h-12"
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products - larger touch targets */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Zoek..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all min-h-[100px]',
                  'hover:border-primary hover:bg-primary/5',
                  'focus:outline-none focus:ring-2 focus:ring-primary',
                  'active:scale-95'
                )}
              >
                <div className="font-semibold text-lg truncate">{product.name}</div>
                <div className="mt-2 text-xl font-bold text-primary">
                  {formatCents(product.price_cents)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart - wider on tablet */}
        <div className="w-80 md:w-96 border-l bg-card flex flex-col flex-shrink-0">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-semibold">Winkelwagen</span>
              {cart.length > 0 && (
                <Badge variant="secondary">{cart.reduce((a, b) => a + b.qty, 0)}</Badge>
              )}
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                Leeg
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                Tik op producten om toe te voegen
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCents(item.priceCents * item.qty)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateQty(item.productId, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center text-lg font-medium">{item.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => updateQty(item.productId, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t p-4 space-y-4">
            <div className="flex justify-between text-2xl font-bold">
              <span>Totaal</span>
              <span>{formatCents(cartTotals.totalCents)}</span>
            </div>

            <Button
              className="w-full h-16 text-xl"
              size="lg"
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
            >
              Afrekenen
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Dialog - optimized for touch */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Afrekenen - {formatCents(cartTotals.totalCents)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-base mb-3 block">Betaalmethode</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setPaymentMethod('CASH')}
                >
                  <Banknote className="h-6 w-6" />
                  <span>Contant</span>
                </Button>
                <Button
                  variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setPaymentMethod('CARD')}
                >
                  <CreditCard className="h-6 w-6" />
                  <span>Kaart</span>
                </Button>
                <Button
                  variant={paymentMethod === 'OTHER' ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setPaymentMethod('OTHER')}
                >
                  <CircleDollarSign className="h-6 w-6" />
                  <span>Overig</span>
                </Button>
              </div>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <Label htmlFor="cashReceived" className="text-base">Ontvangen bedrag</Label>
                <Input
                  id="cashReceived"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="text-2xl h-16 text-center"
                />
                
                {quickAmounts.length > 0 && (
                  <div className="flex gap-2 justify-center">
                    {quickAmounts.map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        className="h-12 px-6"
                        onClick={() => setCashReceived(amount.toString())}
                      >
                        €{amount}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      className="h-12 px-6"
                      onClick={() => setCashReceived((cartTotals.totalCents / 100).toFixed(2))}
                    >
                      Exact
                    </Button>
                  </div>
                )}

                {parseFloat(cashReceived || '0') * 100 >= cartTotals.totalCents && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Wisselgeld: </span>
                    <span className="text-2xl font-bold">
                      {formatCents(parseFloat(cashReceived || '0') * 100 - cartTotals.totalCents)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCheckout(false)} className="h-14">
              Annuleren
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={processingCheckout}
              className="h-14 text-lg min-w-[150px]"
            >
              {processingCheckout ? 'Bezig...' : 'Bevestigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {lastSale && (
        <ReceiptPreview
          open={showReceipt}
          onOpenChange={setShowReceipt}
          sale={lastSale}
          registerName={registerName}
          onNewSale={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
