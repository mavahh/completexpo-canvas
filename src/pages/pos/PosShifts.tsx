import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Monitor, ExternalLink, Clock, Plus } from 'lucide-react';
import { usePosPermissions } from '@/hooks/usePosPermissions';
import { usePosShifts, usePosRegisters } from '@/hooks/usePosData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { OpenShiftDialog } from '@/components/pos/OpenShiftDialog';
import { CloseShiftDialog } from '@/components/pos/CloseShiftDialog';
import { formatCents } from '@/types/pos';
import type { PosShift, PosRegister } from '@/types/pos';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function PosShifts() {
  const { id: eventId } = useParams<{ id: string }>();
  const { loading: permLoading, canOpenShift, canAdmin } = usePosPermissions(eventId || null);
  const { registers, loading: regLoading } = usePosRegisters(eventId || null);
  
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);
  const { shifts, loading: shiftLoading, refetch: refetchShifts } = usePosShifts(eventId || null, selectedRegisterId);

  const [showOpenShiftDialog, setShowOpenShiftDialog] = useState(false);
  const [selectedRegisterForShift, setSelectedRegisterForShift] = useState<PosRegister | null>(null);
  const [shiftToClose, setShiftToClose] = useState<PosShift | null>(null);

  const isLoading = permLoading || regLoading || shiftLoading;

  // Separate open and closed shifts
  const openShifts = shifts.filter(s => s.status === 'OPEN');
  const closedShifts = shifts.filter(s => s.status === 'CLOSED');

  const handleOpenShiftForRegister = (register: PosRegister) => {
    setSelectedRegisterForShift(register);
    setShowOpenShiftDialog(true);
  };

  // Check if register already has open shift
  const registerHasOpenShift = (registerId: string) => {
    return shifts.some(s => s.register_id === registerId && s.status === 'OPEN');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!canOpenShift && !canAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Je hebt geen toegang tot shiftbeheer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">POS Shifts</h1>
          <p className="text-muted-foreground">Beheer shifts en open kiosk schermen</p>
        </div>
        
        <Select value={selectedRegisterId || 'all'} onValueChange={(v) => setSelectedRegisterId(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle kassa's" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kassa's</SelectItem>
            {registers.map(reg => (
              <SelectItem key={reg.id} value={reg.id}>{reg.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Shifts - Prominent display */}
      {openShifts.length > 0 && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              Actieve Shifts
            </CardTitle>
            <CardDescription>
              Klik op "Kiosk openen" om een tablet-scherm te openen voor verkoop
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openShifts.map(shift => (
                <Card key={shift.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{shift.register?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Geopend {format(new Date(shift.opened_at), 'HH:mm', { locale: nl })}
                        </p>
                      </div>
                      <Badge variant="default" className="gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Open
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-4">
                      <p>Start kas: {formatCents(shift.opening_cash_cents)}</p>
                      <p>Door: {shift.opened_by?.name || shift.opened_by?.email || '-'}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => window.open(`/events/${eventId}/pos/kiosk?shift=${shift.id}`, '_blank')}
                      >
                        <Monitor className="h-4 w-4" />
                        Kiosk openen
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShiftToClose(shift)}
                      >
                        Sluiten
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick open shift */}
      {canOpenShift && registers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Shift openen
            </CardTitle>
            <CardDescription>
              Selecteer een kassa om een nieuwe shift te openen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {registers.map(reg => {
                const hasOpen = registerHasOpenShift(reg.id);
                return (
                  <Button
                    key={reg.id}
                    variant={hasOpen ? 'secondary' : 'outline'}
                    onClick={() => !hasOpen && handleOpenShiftForRegister(reg)}
                    disabled={hasOpen}
                    className="gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    {reg.name}
                    {hasOpen && <Badge variant="default" className="ml-2 scale-75">Open</Badge>}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Geschiedenis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kassa</TableHead>
                <TableHead>Geopend</TableHead>
                <TableHead>Geopend door</TableHead>
                <TableHead>Gesloten</TableHead>
                <TableHead>Start cash</TableHead>
                <TableHead>Verwacht</TableHead>
                <TableHead>Geteld</TableHead>
                <TableHead>Verschil</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Geen shifts gevonden
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map(shift => {
                  const difference = shift.closing_cash_cents !== null && shift.expected_cash_cents !== null
                    ? shift.closing_cash_cents - shift.expected_cash_cents
                    : null;
                  
                  return (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.register?.name}</TableCell>
                      <TableCell>{format(new Date(shift.opened_at), 'dd/MM HH:mm', { locale: nl })}</TableCell>
                      <TableCell>{shift.opened_by?.name || shift.opened_by?.email || '-'}</TableCell>
                      <TableCell>
                        {shift.closed_at ? format(new Date(shift.closed_at), 'dd/MM HH:mm', { locale: nl }) : '-'}
                      </TableCell>
                      <TableCell>{formatCents(shift.opening_cash_cents)}</TableCell>
                      <TableCell>{shift.expected_cash_cents !== null ? formatCents(shift.expected_cash_cents) : '-'}</TableCell>
                      <TableCell>{shift.closing_cash_cents !== null ? formatCents(shift.closing_cash_cents) : '-'}</TableCell>
                      <TableCell>
                        {difference !== null ? (
                          <Badge variant={difference === 0 ? 'default' : difference > 0 ? 'secondary' : 'destructive'}>
                            {difference >= 0 ? '+' : ''}{formatCents(difference)}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={shift.status === 'OPEN' ? 'default' : 'secondary'}>
                          {shift.status === 'OPEN' ? 'Open' : 'Gesloten'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Open Shift Dialog */}
      {selectedRegisterForShift && (
        <OpenShiftDialog
          open={showOpenShiftDialog}
          onOpenChange={(open) => {
            setShowOpenShiftDialog(open);
            if (!open) setSelectedRegisterForShift(null);
          }}
          eventId={eventId || ''}
          registerId={selectedRegisterForShift.id}
          registerName={selectedRegisterForShift.name}
          onSuccess={() => {
            refetchShifts();
            setShowOpenShiftDialog(false);
            setSelectedRegisterForShift(null);
          }}
        />
      )}

      {/* Close Shift Dialog */}
      {shiftToClose && (
        <CloseShiftDialog
          open={!!shiftToClose}
          onOpenChange={(open) => !open && setShiftToClose(null)}
          shift={shiftToClose}
          onSuccess={() => {
            refetchShifts();
            setShiftToClose(null);
          }}
        />
      )}
    </div>
  );
}
