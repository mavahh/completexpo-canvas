import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Monitor, CheckCircle2, Circle, ArrowRight, Package, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePosPermissions } from '@/hooks/usePosPermissions';
import { usePosRegisters, usePosProducts, usePosShifts } from '@/hooks/usePosData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RegisterDialog } from '@/components/pos/RegisterDialog';
import { OpenShiftDialog } from '@/components/pos/OpenShiftDialog';
import type { PosRegister } from '@/types/pos';
import { cn } from '@/lib/utils';
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

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

export default function PosSettings() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading: permLoading, canAdmin, canOpenShift } = usePosPermissions(eventId || null);
  const { registers, loading: regLoading, refetch: refetchRegisters } = usePosRegisters(eventId || null);
  const { products, loading: prodLoading } = usePosProducts(eventId || null);
  const { shifts, openShift, loading: shiftLoading, refetch: refetchShifts } = usePosShifts(eventId || null);

  const [editRegister, setEditRegister] = useState<PosRegister | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [deleteRegister, setDeleteRegister] = useState<{ id: string; name: string } | null>(null);
  const [showOpenShiftDialog, setShowOpenShiftDialog] = useState(false);
  const [selectedRegisterForShift, setSelectedRegisterForShift] = useState<PosRegister | null>(null);

  const isLoading = permLoading || regLoading || prodLoading || shiftLoading;

  // Calculate wizard status
  const wizardSteps: WizardStep[] = useMemo(() => {
    const hasRegisters = registers.length > 0;
    const hasProducts = products.length > 0;
    const hasOpenShift = !!openShift;

    return [
      {
        id: 'registers',
        title: 'Kassa aanmaken',
        description: 'Maak minimaal één kassa aan om te kunnen verkopen',
        icon: <Monitor className="h-5 w-5" />,
        completed: hasRegisters,
        action: () => { setEditRegister(null); setShowRegisterDialog(true); },
        actionLabel: 'Kassa toevoegen',
      },
      {
        id: 'products',
        title: 'Producten toevoegen',
        description: 'Voeg producten toe die je wilt verkopen',
        icon: <Package className="h-5 w-5" />,
        completed: hasProducts,
        action: () => navigate(`/events/${eventId}/pos/products`),
        actionLabel: 'Naar producten',
      },
      {
        id: 'shift',
        title: 'Shift openen',
        description: 'Open een shift om te beginnen met verkopen',
        icon: <Users className="h-5 w-5" />,
        completed: hasOpenShift,
        action: hasRegisters ? () => {
          setSelectedRegisterForShift(registers[0]);
          setShowOpenShiftDialog(true);
        } : undefined,
        actionLabel: 'Shift openen',
      },
    ];
  }, [registers, products, openShift, eventId, navigate]);

  const allStepsCompleted = wizardSteps.every(s => s.completed);
  const currentStepIndex = wizardSteps.findIndex(s => !s.completed);

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

  const handleOpenShiftForRegister = (register: PosRegister) => {
    setSelectedRegisterForShift(register);
    setShowOpenShiftDialog(true);
  };

  // Find open shifts per register
  const getOpenShiftForRegister = (registerId: string) => {
    return shifts.find(s => s.register_id === registerId && s.status === 'OPEN');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px]" />
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
        <p className="text-muted-foreground">Configureer het POS systeem voor dit evenement</p>
      </div>

      {/* Wizard / Quick Start */}
      {!allStepsCompleted && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Snel starten</CardTitle>
            <CardDescription>Volg deze stappen om te beginnen met verkopen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wizardSteps.map((step, index) => {
                const isCurrentStep = index === currentStepIndex;
                const isPastStep = index < currentStepIndex;
                
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                      step.completed ? 'bg-muted/50 border-muted' : 
                      isCurrentStep ? 'bg-background border-primary' : 'bg-muted/30 border-muted opacity-60'
                    )}
                  >
                    <div className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      step.completed ? 'bg-primary text-primary-foreground' : 
                      isCurrentStep ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{step.title}</div>
                      <div className="text-sm text-muted-foreground">{step.description}</div>
                    </div>
                    {!step.completed && step.action && isCurrentStep && (
                      <Button onClick={step.action} size="sm" className="gap-2">
                        {step.actionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                    {step.completed && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Klaar
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All steps completed - Go to sell */}
      {allStepsCompleted && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Alles ingesteld!</h3>
                  <p className="text-muted-foreground">Je kunt nu beginnen met verkopen</p>
                </div>
              </div>
              <Button onClick={() => navigate(`/events/${eventId}/pos`)} size="lg" className="gap-2">
                Naar verkoop
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registers Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Kassa's
            </CardTitle>
            <CardDescription>
              Beheer kassa's en open shifts voor tablet/kiosk modus
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
                  <TableHead>Shift</TableHead>
                  <TableHead className="w-[200px]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registers.map(reg => {
                  const regOpenShift = getOpenShiftForRegister(reg.id);
                  
                  return (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{reg.name}</TableCell>
                      <TableCell>{reg.location || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={reg.is_active ? 'default' : 'secondary'}>
                          {reg.is_active ? 'Actief' : 'Inactief'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {regOpenShift ? (
                          <Badge variant="default" className="gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Geen shift</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {regOpenShift ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/events/${eventId}/pos/kiosk?shift=${regOpenShift.id}`, '_blank')}
                              className="gap-1"
                            >
                              <Monitor className="h-4 w-4" />
                              Kiosk openen
                            </Button>
                          ) : canOpenShift && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenShiftForRegister(reg)}
                              className="gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              Shift openen
                            </Button>
                          )}
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
                  );
                })}
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
