import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatCents } from '@/types/pos';
import type { PosShift } from '@/types/pos';

interface CloseShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: PosShift;
  onSuccess: () => void;
}

export function CloseShiftDialog({
  open,
  onOpenChange,
  shift,
  onSuccess,
}: CloseShiftDialogProps) {
  const { user } = useAuth();
  const [closingCash, setClosingCash] = useState('');
  const [expectedCash, setExpectedCash] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpectedCash = async () => {
      if (!shift) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('calculate_shift_expected_cash', {
          _shift_id: shift.id,
        });

        if (error) throw error;
        setExpectedCash(data);
      } catch (error) {
        console.error('Error calculating expected cash:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchExpectedCash();
    }
  }, [shift, open]);

  const closingCashCents = Math.round(parseFloat(closingCash || '0') * 100);
  const difference = expectedCash !== null ? closingCashCents - expectedCash : null;

  const handleSubmit = async () => {
    if (!user || !shift) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('pos_shifts')
        .update({
          closed_by_user_id: user.id,
          closed_at: new Date().toISOString(),
          closing_cash_cents: closingCashCents,
          expected_cash_cents: expectedCash,
          status: 'CLOSED',
        })
        .eq('id', shift.id);

      if (error) throw error;

      toast.success('Shift gesloten');
      setClosingCash('');
      onSuccess();
    } catch (error) {
      console.error('Error closing shift:', error);
      toast.error('Fout bij sluiten shift');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shift sluiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Startbedrag</span>
              <span>{formatCents(shift.opening_cash_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Verwacht eindbedrag</span>
              {loading ? (
                <span className="text-muted-foreground">Laden...</span>
              ) : (
                <span className="font-medium">{formatCents(expectedCash || 0)}</span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="closingCash">Geteld eindbedrag cash (€)</Label>
            <Input
              id="closingCash"
              type="number"
              step="0.01"
              min="0"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {closingCash && difference !== null && (
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-between items-center">
                <span className="text-sm">Verschil</span>
                <Badge
                  variant={difference === 0 ? 'default' : difference > 0 ? 'secondary' : 'destructive'}
                >
                  {difference >= 0 ? '+' : ''}{formatCents(difference)}
                </Badge>
              </div>
              {difference !== 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {difference > 0 ? 'Er zit meer in de kassa dan verwacht.' : 'Er zit minder in de kassa dan verwacht.'}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={processing || !closingCash}>
            {processing ? 'Sluiten...' : 'Shift sluiten'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
