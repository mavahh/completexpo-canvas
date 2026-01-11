import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Layout, Loader2 } from 'lucide-react';

interface Stand {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string | null;
  notes: string | null;
  status: string;
}

interface Floorplan {
  id: string;
  name: string;
  width: number;
  height: number;
  grid_size: number;
  background_url: string | null;
  background_opacity: number | null;
}

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  floorplan: Floorplan | null;
  stands: Stand[];
  onSuccess?: () => void;
}

export function SaveAsTemplateDialog({
  open,
  onClose,
  floorplan,
  stands,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = async () => {
    if (!floorplan || !name.trim()) return;

    setSaving(true);
    try {
      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user?.id)
        .single();

      // Prepare stands data (without exhibitor links)
      const standsData = stands.map(stand => ({
        label: stand.label,
        x: stand.x,
        y: stand.y,
        width: stand.width,
        height: stand.height,
        rotation: stand.rotation,
        color: stand.color,
        notes: stand.notes,
        status: stand.status,
      }));

      const { error } = await supabase.from('floorplan_templates').insert({
        name: name.trim(),
        description: description.trim() || null,
        width: floorplan.width,
        height: floorplan.height,
        grid_size: floorplan.grid_size,
        background_url: floorplan.background_url,
        background_opacity: floorplan.background_opacity,
        stands_data: standsData,
        account_id: profile?.account_id,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Template opgeslagen',
        description: `"${name}" is opgeslagen met ${stands.length} stands`,
      });
      
      onSuccess?.();
      onClose();
      setName('');
      setDescription('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Opslaan als template
          </DialogTitle>
          <DialogDescription>
            Sla de huidige plattegrond op als herbruikbare template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">Naam</Label>
            <Input
              id="templateName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Hal A standaard layout"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateDescription">Beschrijving (optioneel)</Label>
            <Textarea
              id="templateDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Voeg een beschrijving toe..."
              rows={2}
            />
          </div>

          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-2">Wordt opgeslagen:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Afmetingen: {floorplan?.width} × {floorplan?.height}px</li>
              <li>• Grid: {floorplan?.grid_size}px</li>
              <li>• Stands: {stands.length} (zonder exposant-koppelingen)</li>
              {floorplan?.background_url && <li>• Achtergrond afbeelding</li>}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : (
              'Opslaan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
