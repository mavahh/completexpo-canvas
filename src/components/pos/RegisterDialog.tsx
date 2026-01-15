import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { PosRegister } from '@/types/pos';

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  register: PosRegister | null;
  onSuccess: () => void;
}

export function RegisterDialog({
  open,
  onOpenChange,
  eventId,
  register,
  onSuccess,
}: RegisterDialogProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (register) {
      setName(register.name);
      setLocation(register.location || '');
      setIsActive(register.is_active);
    } else {
      setName('');
      setLocation('');
      setIsActive(true);
    }
  }, [register, open]);

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
        location: location.trim() || null,
        is_active: isActive,
      };

      if (register) {
        const { error } = await supabase
          .from('pos_registers')
          .update(data)
          .eq('id', register.id);
        if (error) throw error;
        toast.success('Kassa bijgewerkt');
      } else {
        const { error } = await supabase
          .from('pos_registers')
          .insert(data);
        if (error) throw error;
        toast.success('Kassa aangemaakt');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving register:', error);
      toast.error('Fout bij opslaan');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{register ? 'Kassa bewerken' : 'Nieuwe kassa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kassanaam"
            />
          </div>

          <div>
            <Label htmlFor="location">Locatie</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bijv. Hal A, Ingang Noord"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Actief</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
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
