import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { PosCategory } from '@/types/pos';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  category: PosCategory | null;
  onSuccess: () => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  eventId,
  category,
  onSuccess,
}: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSortOrder(category.sort_order.toString());
    } else {
      setName('');
      setSortOrder('0');
    }
  }, [category, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Naam is verplicht');
      return;
    }

    setProcessing(true);
    try {
      const data = {
        event_id: eventId,
        name: name.trim(),
        sort_order: parseInt(sortOrder) || 0,
      };

      if (category) {
        const { error } = await supabase
          .from('pos_categories')
          .update(data)
          .eq('id', category.id);
        if (error) throw error;
        toast.success('Categorie bijgewerkt');
      } else {
        const { error } = await supabase
          .from('pos_categories')
          .insert(data);
        if (error) throw error;
        toast.success('Categorie aangemaakt');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Fout bij opslaan');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Categorie bewerken' : 'Nieuwe categorie'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Categorienaam"
            />
          </div>

          <div>
            <Label htmlFor="sortOrder">Sorteervolgorde</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lagere nummers worden eerst getoond
            </p>
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
