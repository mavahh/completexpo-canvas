import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePosPermissions } from '@/hooks/usePosPermissions';
import { usePosShifts, usePosRegisters } from '@/hooks/usePosData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCents } from '@/types/pos';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function PosShifts() {
  const { id: eventId } = useParams<{ id: string }>();
  const { loading: permLoading, canOpenShift, canAdmin } = usePosPermissions(eventId || null);
  const { registers, loading: regLoading } = usePosRegisters(eventId || null);
  
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);
  const { shifts, loading: shiftLoading } = usePosShifts(eventId || null, selectedRegisterId);

  const isLoading = permLoading || regLoading || shiftLoading;

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
        <h1 className="text-2xl font-bold">POS Shifts</h1>
        
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

      <Card>
        <CardHeader>
          <CardTitle>Shift Overzicht</CardTitle>
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
                      <TableCell>{shift.opened_by?.name || shift.opened_by?.email}</TableCell>
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
    </div>
  );
}
