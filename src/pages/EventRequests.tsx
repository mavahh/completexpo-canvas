import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { StandRequest } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Check, X, Eye, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const STATUS_LABELS = {
  NEW: { label: 'Nieuw', variant: 'default' },
  APPROVED: { label: 'Goedgekeurd', variant: 'success' },
  REJECTED: { label: 'Afgewezen', variant: 'destructive' },
  PROCESSED: { label: 'Verwerkt', variant: 'secondary' },
} as const;

const POWER_LABELS: Record<string, string> = {
  'NONE': 'Geen',
  'WATT_500': '500 Watt',
  'WATT_2000': '2000 Watt',
  'WATT_3500': '3500 Watt',
  'AMP_16A': '16A',
  'AMP_32A': '32A',
};

export default function EventRequests() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission, loading: permLoading } = usePermissions();

  const [requests, setRequests] = useState<StandRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<StandRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [processing, setProcessing] = useState(false);

  const canManageRequests = hasPermission('REQUESTS_MANAGE');

  useEffect(() => {
    if (eventId) fetchRequests();
  }, [eventId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('stand_requests')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (request: StandRequest, newStatus: StandRequest['status']) => {
    setProcessing(true);
    try {
      await supabase
        .from('stand_requests')
        .update({ 
          status: newStatus,
          processed_at: newStatus !== 'NEW' ? new Date().toISOString() : null,
        })
        .eq('id', request.id);

      toast({ title: 'Bijgewerkt', description: `Status is aangepast naar ${STATUS_LABELS[newStatus].label}` });
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const approveAndCreateExhibitor = async (request: StandRequest) => {
    if (!eventId) return;
    setProcessing(true);

    try {
      // Create exhibitor
      const { data: exhibitor, error: exError } = await supabase
        .from('exhibitors')
        .insert({
          event_id: eventId,
          name: request.company_name,
          contact_name: request.contact_name,
          email: request.email,
          phone: request.phone,
          vat: request.vat,
          notes: request.notes,
        })
        .select()
        .single();

      if (exError) throw exError;

      // Create exhibitor services
      const { error: svcError } = await supabase
        .from('exhibitor_services')
        .insert([{
          exhibitor_id: exhibitor.id,
          water_connections: request.water_connections,
          power_option: request.power_option as any,
          light_points: request.light_points,
          construction_booked: request.construction_booked,
          carpet_included: request.carpet_included,
          surface_type: request.surface_type as any,
        }]);

      if (svcError) throw svcError;

      // Try to link to existing stand if label matches
      if (request.requested_stand_label) {
        const { data: stand } = await supabase
          .from('stands')
          .select('id')
          .eq('event_id', eventId)
          .eq('label', request.requested_stand_label)
          .single();

        if (stand) {
          await supabase
            .from('stands')
            .update({ exhibitor_id: exhibitor.id })
            .eq('id', stand.id);
        }
      }

      // Update request status
      await supabase
        .from('stand_requests')
        .update({
          status: 'APPROVED',
          processed_at: new Date().toISOString(),
          created_exhibitor_id: exhibitor.id,
        })
        .eq('id', request.id);

      toast({
        title: 'Goedgekeurd',
        description: `Exposant "${request.company_name}" is aangemaakt${request.requested_stand_label ? ' en gekoppeld aan stand ' + request.requested_stand_label : ''}`,
      });

      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(
    (r) => filterStatus === 'all' || r.status === filterStatus
  );

  if (loading || permLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${eventId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Terug
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aanvragen</h1>
            <p className="text-muted-foreground">
              {requests.filter((r) => r.status === 'NEW').length} nieuwe aanvragen
            </p>
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="NEW">Nieuw</SelectItem>
            <SelectItem value="APPROVED">Goedgekeurd</SelectItem>
            <SelectItem value="REJECTED">Afgewezen</SelectItem>
            <SelectItem value="PROCESSED">Verwerkt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bedrijf</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Stand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="w-24">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.company_name}</TableCell>
                <TableCell>
                  <div>{request.contact_name}</div>
                  <div className="text-sm text-muted-foreground">{request.email}</div>
                </TableCell>
                <TableCell>
                  {request.requested_stand_label || (
                    request.requested_area ? `${request.requested_area}m²` : '-'
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_LABELS[request.status].variant as any}>
                    {STATUS_LABELS[request.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(request.created_at), 'd MMM yyyy', { locale: nl })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Geen aanvragen gevonden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {selectedRequest.company_name}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_LABELS[selectedRequest.status].variant as any}>
                    {STATUS_LABELS[selectedRequest.status].label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(selectedRequest.created_at), 'd MMMM yyyy HH:mm', { locale: nl })}
                  </span>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Contactgegevens</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Contact:</span>
                    <span>{selectedRequest.contact_name}</span>
                    <span className="text-muted-foreground">Email:</span>
                    <span>{selectedRequest.email}</span>
                    <span className="text-muted-foreground">Telefoon:</span>
                    <span>{selectedRequest.phone || '-'}</span>
                    <span className="text-muted-foreground">BTW:</span>
                    <span>{selectedRequest.vat || '-'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Gewenste stand</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Standnummer:</span>
                    <span>{selectedRequest.requested_stand_label || '-'}</span>
                    <span className="text-muted-foreground">Oppervlakte:</span>
                    <span>{selectedRequest.requested_area ? `${selectedRequest.requested_area}m²` : '-'}</span>
                    <span className="text-muted-foreground">Afmetingen:</span>
                    <span>
                      {selectedRequest.requested_width && selectedRequest.requested_height
                        ? `${selectedRequest.requested_width}m x ${selectedRequest.requested_height}m`
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Gewenste opties</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Stroom:</span>
                    <span>{POWER_LABELS[selectedRequest.power_option] || selectedRequest.power_option}</span>
                    <span className="text-muted-foreground">Water:</span>
                    <span>{selectedRequest.water_connections} aansluiting(en)</span>
                    <span className="text-muted-foreground">Lichtpunten:</span>
                    <span>{selectedRequest.light_points}</span>
                    <span className="text-muted-foreground">Constructie:</span>
                    <span>{selectedRequest.construction_booked ? 'Ja' : 'Nee'}</span>
                    <span className="text-muted-foreground">Tapijt:</span>
                    <span>{selectedRequest.carpet_included ? 'Ja' : 'Nee'}</span>
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Opmerkingen</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedRequest.notes}
                    </p>
                  </div>
                )}

                {canManageRequests && selectedRequest.status === 'NEW' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => approveAndCreateExhibitor(selectedRequest)}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Goedkeuren & Aanmaken
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => updateStatus(selectedRequest, 'REJECTED')}
                      disabled={processing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {canManageRequests && selectedRequest.status === 'APPROVED' && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => updateStatus(selectedRequest, 'PROCESSED')}
                      disabled={processing}
                    >
                      Markeer als verwerkt
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
