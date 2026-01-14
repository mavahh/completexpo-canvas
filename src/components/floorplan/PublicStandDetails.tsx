import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { STAND_STATUS_CONFIG, StandStatus } from './StandLegend';
import { Zap, Droplets, Lightbulb, Hammer, Square, StickyNote, User, Mail, Phone } from 'lucide-react';
import type { Stand, ExhibitorContact, ExhibitorServices } from '@/types';

interface PublicStandDetailsProps {
  stand: Stand | null;
  exhibitor: ExhibitorContact | null;
  services: ExhibitorServices | null;
}

export function PublicStandDetails({ stand, exhibitor, services }: PublicStandDetailsProps) {
  if (!stand) {
    return (
      <div className="h-full flex items-center justify-center text-center">
        <div className="space-y-2">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Square className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Klik op een stand om details te bekijken
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = STAND_STATUS_CONFIG[stand.status] || STAND_STATUS_CONFIG.AVAILABLE;

  return (
    <div className="space-y-4">
      <CardHeader className="p-0">
        <CardTitle className="text-lg">Stand Details</CardTitle>
      </CardHeader>

      {/* Stand info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">{stand.label}</span>
            <Badge 
              style={{ backgroundColor: statusConfig.color, color: '#fff' }}
            >
              {statusConfig.label}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {stand.width} × {stand.height} px
            {stand.rotation !== 0 && ` · ${stand.rotation}° rotatie`}
          </div>

          {stand.notes && (
            <div className="flex items-start gap-2 text-sm">
              <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{stand.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exhibitor info */}
      {exhibitor && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Exposant</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="font-semibold text-foreground">{exhibitor.name}</div>
            
            {exhibitor.contact_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                {exhibitor.contact_name}
              </div>
            )}
            
            {exhibitor.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                {exhibitor.email}
              </div>
            )}
            
            {exhibitor.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                {exhibitor.phone}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {services && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Opties & Services</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {services.power_option && services.power_option !== 'NONE' && (
                <Badge variant="secondary" className="gap-1">
                  <Zap className="w-3 h-3" />
                  {services.power_option.replace('WATT_', '').replace('AMP_', '')}
                </Badge>
              )}
              
              {services.water_connections > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Droplets className="w-3 h-3" />
                  {services.water_connections}x water
                </Badge>
              )}
              
              {services.light_points > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Lightbulb className="w-3 h-3" />
                  {services.light_points}x licht
                </Badge>
              )}
              
              {services.construction_booked && (
                <Badge variant="secondary" className="gap-1">
                  <Hammer className="w-3 h-3" />
                  Standbouw
                </Badge>
              )}
              
              {services.carpet_included && (
                <Badge variant="secondary" className="gap-1">
                  <Square className="w-3 h-3" />
                  Tapijt
                </Badge>
              )}

              {services.surface_type && services.surface_type !== 'EMPTY' && (
                <Badge variant="outline">
                  {services.surface_type === 'EMPTY_WITH_CARPET' ? 'Met tapijt' : 'Met standbouw'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
