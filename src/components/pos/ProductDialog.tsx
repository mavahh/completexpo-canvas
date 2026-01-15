import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { PosProduct, PosCategory, VatRate } from '@/types/pos';
import { VAT_RATE_LABELS } from '@/types/pos';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  product: PosProduct | null;
  categories: PosCategory[];
  onSuccess: () => void;
}

const VAT_OPTIONS: VatRate[] = ['VAT_0', 'VAT_6', 'VAT_12', 'VAT_21'];

export function ProductDialog({
  open,
  onOpenChange,
  eventId,
  product,
  categories,
  onSuccess,
}: ProductDialogProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [priceEuros, setPriceEuros] = useState('');
  const [vatRate, setVatRate] = useState<VatRate>('VAT_21');
  const [active, setActive] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku || '');
      setCategoryId(product.category_id || '');
      setPriceEuros((product.price_cents / 100).toFixed(2));
      setVatRate(product.vat_rate);
      setActive(product.active);
    } else {
      setName('');
      setSku('');
      setCategoryId('');
      setPriceEuros('');
      setVatRate('VAT_21');
      setActive(true);
    }
  }, [product, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Naam is verplicht');
      return;
    }

    const priceCents = Math.round(parseFloat(priceEuros || '0') * 100);
    if (priceCents <= 0) {
      toast.error('Prijs moet groter dan 0 zijn');
      return;
    }

    setProcessing(true);
    try {
      const data = {
        event_id: eventId,
        name: name.trim(),
        sku: sku.trim() || null,
        category_id: categoryId || null,
        price_cents: priceCents,
        vat_rate: vatRate,
        active,
      };

      if (product) {
        const { error } = await supabase
          .from('pos_products')
          .update(data)
          .eq('id', product.id);
        if (error) throw error;
        toast.success('Product bijgewerkt');
      } else {
        const { error } = await supabase
          .from('pos_products')
          .insert(data);
        if (error) throw error;
        toast.success('Product aangemaakt');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Fout bij opslaan');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Product bewerken' : 'Nieuw product'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Productnaam"
            />
          </div>

          <div>
            <Label htmlFor="sku">SKU / Artikelnummer</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Optioneel"
            />
          </div>

          <div>
            <Label htmlFor="category">Categorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Geen categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Geen categorie</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Prijs (€) incl. BTW *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={priceEuros}
                onChange={(e) => setPriceEuros(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="vatRate">BTW tarief</Label>
              <Select value={vatRate} onValueChange={(v) => setVatRate(v as VatRate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAT_OPTIONS.map(rate => (
                    <SelectItem key={rate} value={rate}>
                      {VAT_RATE_LABELS[rate]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Actief</Label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={processing}>
            {processing ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
