import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface Floorplan {
  id: string;
  name: string;
  hall: string | null;
}

interface HallSelectorProps {
  eventId: string;
  floorplans: Floorplan[];
  selectedFloorplanId: string | null;
  onSelect: (id: string) => void;
  onFloorplanAdded: (floorplan: Floorplan) => void;
  disabled?: boolean;
}

export function HallSelector({
  eventId,
  floorplans,
  selectedFloorplanId,
  onSelect,
  onFloorplanAdded,
  disabled = false,
}: HallSelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [hall, setHall] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Naam verplicht',
        description: 'Voer een naam in voor de plattegrond.',
      });
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('floorplans')
        .insert({
          event_id: eventId,
          name: name.trim(),
          hall: hall.trim() || null,
          width: 1200,
          height: 800,
          grid_size: 20,
        })
        .select()
        .single();

      if (error) throw error;

      onFloorplanAdded(data);
      setOpen(false);
      setName('');
      setHall('');
      toast({
        title: 'Plattegrond aangemaakt',
        description: `"${data.name}" is toegevoegd.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedFloorplanId || ''} onValueChange={onSelect}>
        <SelectTrigger className="w-48 h-9">
          <SelectValue placeholder="Selecteer hal" />
        </SelectTrigger>
        <SelectContent>
          {floorplans.map((fp) => (
            <SelectItem key={fp.id} value={fp.id}>
              {fp.name}
              {fp.hall && <span className="text-muted-foreground ml-1">({fp.hall})</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!disabled && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe plattegrond</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-name">Naam *</Label>
                <Input
                  id="fp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. Hal 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fp-hall">Hal/Gebouw</Label>
                <Input
                  id="fp-hall"
                  value={hall}
                  onChange={(e) => setHall(e.target.value)}
                  placeholder="bijv. Flanders Expo"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aanmaken
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
