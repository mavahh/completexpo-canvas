import { Droplets, Zap, Hammer } from 'lucide-react';

interface ExhibitorServices {
  water_connections: number;
  power_option: string;
  construction_booked: boolean;
}

interface StandServiceIconsProps {
  services: ExhibitorServices | null;
  zoom: number;
}

export function StandServiceIcons({ services, zoom }: StandServiceIconsProps) {
  if (!services) return null;

  const hasWater = services.water_connections > 0;
  const hasPower = services.power_option !== 'NONE';
  const hasConstruction = services.construction_booked;

  if (!hasWater && !hasPower && !hasConstruction) return null;

  // Scale icons based on zoom level, but with min/max bounds
  const iconSize = Math.max(8, Math.min(14, 10 / zoom));
  const gap = Math.max(1, 2 / zoom);

  return (
    <div 
      className="absolute bottom-0.5 right-0.5 flex pointer-events-none"
      style={{ gap: `${gap}px` }}
    >
      {hasWater && (
        <div 
          className="bg-blue-500/80 rounded-sm p-0.5"
          title={`Water: ${services.water_connections} aansluiting(en)`}
        >
          <Droplets 
            className="text-white" 
            style={{ width: iconSize, height: iconSize }} 
          />
        </div>
      )}
      {hasPower && (
        <div 
          className="bg-yellow-500/80 rounded-sm p-0.5"
          title={`Stroom: ${services.power_option.replace('_', ' ')}`}
        >
          <Zap 
            className="text-white" 
            style={{ width: iconSize, height: iconSize }} 
          />
        </div>
      )}
      {hasConstruction && (
        <div 
          className="bg-orange-500/80 rounded-sm p-0.5"
          title="Constructie geboekt"
        >
          <Hammer 
            className="text-white" 
            style={{ width: iconSize, height: iconSize }} 
          />
        </div>
      )}
    </div>
  );
}
