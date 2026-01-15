import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface OpenShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  registerId: string;
  registerName: string;
  onSuccess: () => void;
}

export function OpenShiftDialog({
  open,
  onOpenChange,
  eventId,
  registerId,
  registerName,
  onSuccess,
}: OpenShiftDialogProps) {
  const { user } = useAuth();
  const [openingCash, setOpeningCash] = useState('0');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!user || !eventId || !registerId) return;

    const openingCashCents = Math.round(parseFloat(openingCash || '0') * 100);

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('pos_shifts')
        .insert({
          event_id: eventId,
          register_id: registerId,
          opened_by_user_id: user.id,
          opening_cash_cents: openingCashCents,
          status: 'OPEN',
        });

      if (error) throw error;

      toast.success('Shift geopend');
      setOpeningCash('0');
      onSuccess();
    } catch (error) {
      console.error('Error opening shift:', error);
      toast.error('Fout bij openen shift');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shift openen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Kassa</Label>
            <p className="text-sm text-muted-foreground">{registerName}</p>
          </div>

          <div>
            <Label htmlFor="openingCash">Startbedrag cash (€)</Label>
            <Input
              id="openingCash"
              type="number"
              step="0.01"
              min="0"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tel het cash bedrag in de kassa voordat je begint
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={processing}>
            {processing ? 'Openen...' : 'Shift openen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
