import { Droplets, Zap, Lightbulb, Hammer, SquareStack, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ExhibitorServices {
  water_connections: number;
  power_option: string;
  light_points: number;
  construction_booked: boolean;
  carpet_included: boolean;
  surface_type: string;
}

interface ExhibitorServicesPanelProps {
  exhibitorName: string | null;
  services: ExhibitorServices | null;
}

const POWER_LABELS: Record<string, string> = {
  'NONE': 'Geen',
  'WATT_500': '500 Watt',
  'WATT_2000': '2000 Watt',
  'WATT_3500': '3500 Watt',
  'AMP_16A': '16A',
  'AMP_32A': '32A',
};

const SURFACE_LABELS: Record<string, string> = {
  'EMPTY': 'Leeg',
  'EMPTY_WITH_CARPET': 'Met tapijt',
  'WITH_CONSTRUCTION': 'Met standbouw',
};

export function ExhibitorServicesPanel({ exhibitorName, services }: ExhibitorServicesPanelProps) {
  if (!exhibitorName) {
    return (
      <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Ban className="w-4 h-4" />
          <span className="text-sm">Geen exposant gekoppeld</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <Separator />
      <h4 className="font-medium text-sm text-foreground">Exposant opties</h4>
      
      <div className="space-y-2 text-sm">
        {/* Power */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Stroom</span>
          </div>
          <Badge variant={services?.power_option && services.power_option !== 'NONE' ? 'default' : 'secondary'}>
            {services ? POWER_LABELS[services.power_option] || services.power_option : 'Geen'}
          </Badge>
        </div>

        {/* Water */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span>Water</span>
          </div>
          <Badge variant={services?.water_connections ? 'default' : 'secondary'}>
            {services?.water_connections || 0} aansluiting(en)
          </Badge>
        </div>

        {/* Light points */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Lichtpunten</span>
          </div>
          <Badge variant={services?.light_points ? 'default' : 'secondary'}>
            {services?.light_points || 0}
          </Badge>
        </div>

        {/* Construction */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hammer className="w-4 h-4 text-orange-500" />
            <span>Constructie</span>
          </div>
          <Badge variant={services?.construction_booked ? 'default' : 'secondary'}>
            {services?.construction_booked ? 'Geboekt' : 'Nee'}
          </Badge>
        </div>

        {/* Surface type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <SquareStack className="w-4 h-4 text-emerald-500" />
            <span>Oppervlak</span>
          </div>
          <Badge variant="outline">
            {services ? SURFACE_LABELS[services.surface_type] || services.surface_type : 'Leeg'}
          </Badge>
        </div>

        {/* Carpet */}
        {services?.carpet_included && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs">✓ Tapijt inbegrepen</span>
          </div>
        )}
      </div>
    </div>
  );
}
