import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, X, Loader2, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface BackgroundUploadProps {
  floorplanId: string;
  currentBackground: string | null;
  currentOpacity: number;
  onBackgroundChange: (url: string | null, opacity: number) => void;
  disabled?: boolean;
}

export function BackgroundUpload({
  floorplanId,
  currentBackground,
  currentOpacity,
  onBackgroundChange,
  disabled = false,
}: BackgroundUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [opacity, setOpacity] = useState(currentOpacity);
  const [open, setOpen] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Ongeldig bestandstype',
        description: 'Upload een PNG, JPG of WebP afbeelding.',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Bestand te groot',
        description: 'Maximum bestandsgrootte is 10MB.',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${floorplanId}-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('floorplan-backgrounds')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('floorplan-backgrounds')
        .getPublicUrl(filePath);

      // Update floorplan in database
      const { error: updateError } = await supabase
        .from('floorplans')
        .update({ 
          background_url: publicUrl,
          background_opacity: opacity 
        })
        .eq('id', floorplanId);

      if (updateError) throw updateError;

      onBackgroundChange(publicUrl, opacity);
      toast({
        title: 'Achtergrond geüpload',
        description: 'De achtergrond is succesvol toegevoegd.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload mislukt',
        description: error.message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackground = async () => {
    try {
      const { error } = await supabase
        .from('floorplans')
        .update({ background_url: null, background_opacity: 100 })
        .eq('id', floorplanId);

      if (error) throw error;

      onBackgroundChange(null, 100);
      setOpacity(100);
      toast({
        title: 'Achtergrond verwijderd',
        description: 'De achtergrond is verwijderd.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    }
  };

  const handleOpacityChange = async (value: number[]) => {
    const newOpacity = value[0];
    setOpacity(newOpacity);

    try {
      await supabase
        .from('floorplans')
        .update({ background_opacity: newOpacity })
        .eq('id', floorplanId);

      onBackgroundChange(currentBackground, newOpacity);
    } catch (error) {
      console.error('Failed to update opacity:', error);
    }
  };

  if (disabled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Image className="w-4 h-4 mr-1" />
          Achtergrond
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Achtergrond beheren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {currentBackground ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={currentBackground}
                  alt="Huidige achtergrond"
                  className="w-full h-full object-contain"
                  style={{ opacity: opacity / 100 }}
                />
              </div>

              <div className="space-y-2">
                <Label>Transparantie: {opacity}%</Label>
                <Slider
                  value={[opacity]}
                  onValueChange={handleOpacityChange}
                  min={10}
                  max={100}
                  step={5}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Vervangen
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemoveBackground}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Verwijderen
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {uploading
                  ? 'Bezig met uploaden...'
                  : 'Klik om een achtergrond te uploaden'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG of WebP - max 10MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
