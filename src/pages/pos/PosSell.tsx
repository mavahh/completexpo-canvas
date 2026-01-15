import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, CircleDollarSign, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePosPermissions } from '@/hooks/usePosPermissions';
import { usePosCategories, usePosProducts, usePosRegisters, usePosShifts } from '@/hooks/usePosData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OpenShiftDialog } from '@/components/pos/OpenShiftDialog';
import { CloseShiftDialog } from '@/components/pos/CloseShiftDialog';
import { ReceiptPreview } from '@/components/pos/ReceiptPreview';
import type { CartItem, PaymentMethod, PosSale } from '@/types/pos';
import { formatCents, calculateCartTotals, VAT_RATE_LABELS } from '@/types/pos';

export default function PosSell() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading: permLoading, canView, canSell, canOpenShift } = usePosPermissions(eventId || null);
  
  const { categories, loading: catLoading } = usePosCategories(eventId || null);
  const { products, loading: prodLoading } = usePosProducts(eventId || null, true);
  const { registers, loading: regLoading } = usePosRegisters(eventId || null, true);
  
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);
  const { openShift, loading: shiftLoading, refetch: refetchShifts } = usePosShifts(eventId || null, selectedRegisterId);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);

  // Auto-select first register
  useEffect(() => {
    if (registers.length > 0 && !selectedRegisterId) {
      setSelectedRegisterId(registers[0].id);
    }
  }, [registers, selectedRegisterId]);

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
    if (!canSell || !openShift) return;
    
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

  // Checkout
  const handleCheckout = async () => {
    if (!eventId || !user || !openShift || !selectedRegisterId || cart.length === 0) return;
    
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
          register_id: selectedRegisterId,
          shift_id: openShift.id,
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
  const isLoading = permLoading || catLoading || prodLoading || regLoading || shiftLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-2">
            <Skeleton className="h-[400px]" />
          </div>
          <div className="col-span-7">
            <Skeleton className="h-[400px]" />
          </div>
          <div className="col-span-3">
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Je hebt geen toegang tot de POS module.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedRegister = registers.find(r => r.id === selectedRegisterId);

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="border-b bg-card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">POS Verkoop</h1>
          
          {registers.length > 1 && (
            <Select value={selectedRegisterId || ''} onValueChange={setSelectedRegisterId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecteer kassa" />
              </SelectTrigger>
              <SelectContent>
                {registers.map(reg => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {reg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={openShift ? 'default' : 'secondary'} className="gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              openShift ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
            )} />
            {openShift ? 'Shift OPEN' : 'Shift GESLOTEN'}
          </Badge>

          {canOpenShift && !openShift && selectedRegisterId && (
            <Button onClick={() => setShowOpenShift(true)}>
              Shift openen
            </Button>
          )}

          {canOpenShift && openShift && (
            <Button variant="outline" onClick={() => setShowCloseShift(true)}>
              Shift sluiten
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Categories */}
        <div className="col-span-2 border-r bg-muted/30 p-4 overflow-y-auto">
          <div className="space-y-2">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedCategoryId(null)}
            >
              Alle producten
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="col-span-7 p-4 overflow-y-auto">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {!openShift && (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Open eerst een shift om te kunnen verkopen.</p>
            </div>
          )}

          {openShift && filteredProducts.length === 0 && (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Geen producten gevonden.</p>
            </div>
          )}

          {openShift && filteredProducts.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={!canSell}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all',
                    'hover:border-primary hover:bg-primary/5',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <div className="font-medium truncate">{product.name}</div>
                  <div className="text-sm text-muted-foreground">{product.sku}</div>
                  <div className="mt-2 font-semibold text-primary">
                    {formatCents(product.price_cents)}
                  </div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {VAT_RATE_LABELS[product.vat_rate]}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="col-span-3 border-l bg-card flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-medium">Winkelwagen</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                Leegmaken
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Winkelwagen is leeg
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCents(item.priceCents)} x {item.qty}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQty(item.productId, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.qty}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQty(item.productId, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotaal</span>
                <span>{formatCents(cartTotals.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>BTW</span>
                <span>{formatCents(cartTotals.vatCents)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Totaal</span>
                <span>{formatCents(cartTotals.totalCents)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0 || !canSell || !openShift}
              onClick={() => setShowCheckout(true)}
            >
              Afrekenen
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Afrekenen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Te betalen</div>
              <div className="text-3xl font-bold">{formatCents(cartTotals.totalCents)}</div>
            </div>

            <div>
              <Label>Betaalmethode</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-4"
                  onClick={() => setPaymentMethod('CASH')}
                >
                  <Banknote className="h-6 w-6 mb-1" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-4"
                  onClick={() => setPaymentMethod('CARD')}
                >
                  <CreditCard className="h-6 w-6 mb-1" />
                  Kaart
                </Button>
                <Button
                  variant={paymentMethod === 'OTHER' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-4"
                  onClick={() => setPaymentMethod('OTHER')}
                >
                  <CircleDollarSign className="h-6 w-6 mb-1" />
                  Overig
                </Button>
              </div>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="space-y-2">
                <Label>Ontvangen bedrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                />
                {cashReceived && parseFloat(cashReceived) >= cartTotals.totalCents / 100 && (
                  <div className="p-3 bg-green-500/10 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Wisselgeld</div>
                    <div className="text-xl font-bold text-green-500">
                      {formatCents(Math.round(parseFloat(cashReceived) * 100) - cartTotals.totalCents)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCheckout} disabled={processingCheckout}>
              {processingCheckout ? 'Verwerken...' : 'Bevestigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Shift Dialog */}
      <OpenShiftDialog
        open={showOpenShift}
        onOpenChange={setShowOpenShift}
        eventId={eventId || ''}
        registerId={selectedRegisterId || ''}
        registerName={selectedRegister?.name || ''}
        onSuccess={() => {
          refetchShifts();
          setShowOpenShift(false);
        }}
      />

      {/* Close Shift Dialog */}
      {openShift && (
        <CloseShiftDialog
          open={showCloseShift}
          onOpenChange={setShowCloseShift}
          shift={openShift}
          onSuccess={() => {
            refetchShifts();
            setShowCloseShift(false);
          }}
        />
      )}

      {/* Receipt Preview */}
      {lastSale && (
        <ReceiptPreview
          open={showReceipt}
          onOpenChange={setShowReceipt}
          sale={lastSale}
          registerName={selectedRegister?.name || ''}
          onNewSale={() => {
            setShowReceipt(false);
            setLastSale(null);
          }}
        />
      )}
    </div>
  );
}
