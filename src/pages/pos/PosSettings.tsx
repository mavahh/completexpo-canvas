import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePosPermissions } from '@/hooks/usePosPermissions';
import { usePosRegisters } from '@/hooks/usePosData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RegisterDialog } from '@/components/pos/RegisterDialog';
import type { PosRegister } from '@/types/pos';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PosSettings() {
  const { id: eventId } = useParams<{ id: string }>();
  const { loading: permLoading, canAdmin } = usePosPermissions(eventId || null);
  const { registers, loading: regLoading, refetch: refetchRegisters } = usePosRegisters(eventId || null);

  const [editRegister, setEditRegister] = useState<PosRegister | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [deleteRegister, setDeleteRegister] = useState<{ id: string; name: string } | null>(null);

  const isLoading = permLoading || regLoading;

  const handleDelete = async () => {
    if (!deleteRegister) return;

    try {
      const { error } = await supabase
        .from('pos_registers')
        .delete()
        .eq('id', deleteRegister.id);

      if (error) throw error;
      toast.success('Kassa verwijderd');
      refetchRegisters();
    } catch (error) {
      console.error('Error deleting register:', error);
      toast.error('Fout bij verwijderen');
    } finally {
      setDeleteRegister(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!canAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Je hebt geen toegang tot POS instellingen.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">POS Instellingen</h1>
        <p className="text-muted-foreground">Beheer kassa's en algemene POS configuratie</p>
      </div>

      {/* Registers Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Kassa's
            </CardTitle>
            <CardDescription>
              Maak kassa's aan voordat je shifts kunt openen en verkopen
            </CardDescription>
          </div>
          <Button onClick={() => { setEditRegister(null); setShowRegisterDialog(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Kassa toevoegen
          </Button>
        </CardHeader>
        <CardContent>
          {registers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Geen kassa's gevonden</p>
              <p className="text-sm">Maak een kassa aan om te beginnen met verkopen</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Locatie</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registers.map(reg => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.name}</TableCell>
                    <TableCell>{reg.location || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={reg.is_active ? 'default' : 'secondary'}>
                        {reg.is_active ? 'Actief' : 'Inactief'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditRegister(reg); setShowRegisterDialog(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteRegister({ id: reg.id, name: reg.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Register Dialog */}
      <RegisterDialog
        open={showRegisterDialog}
        onOpenChange={setShowRegisterDialog}
        eventId={eventId || ''}
        register={editRegister}
        onSuccess={() => {
          refetchRegisters();
          setShowRegisterDialog(false);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRegister} onOpenChange={() => setDeleteRegister(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kassa verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt om "{deleteRegister?.name}" te verwijderen. 
              Dit kan alleen als er geen shifts aan gekoppeld zijn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
