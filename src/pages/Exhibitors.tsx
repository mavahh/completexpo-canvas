import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ExhibitorServicesDialog } from '@/components/exhibitors/ExhibitorServicesDialog';
import { ExhibitorInviteDialog } from '@/components/exhibitors/ExhibitorInviteDialog';
import type { ExhibitorWithServices as Exhibitor, PowerOption } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { 
  Plus, 
  Search, 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Loader2, 
  User, 
  Mail, 
  Phone,
  Settings2,
  Zap,
  Droplets,
  Lightbulb,
  Send
} from 'lucide-react';

const powerLabels: Record<PowerOption, string> = {
  NONE: '',
  WATT_500: '500W',
  WATT_2000: '2kW',
  WATT_3500: '3.5kW',
  AMP_16A: '16A',
  AMP_32A: '32A',
};

export default function Exhibitors() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [servicesExhibitor, setServicesExhibitor] = useState<{ id: string; name: string } | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    vat: '',
    notes: '',
  });

  useEffect(() => {
    fetchExhibitors();
  }, [eventId]);

  useEffect(() => {
    if (search) {
      setSearchParams({ q: search });
    } else {
      setSearchParams({});
    }
  }, [search]);

  const fetchExhibitors = async () => {
    if (!eventId) return;

    const { data, error } = await supabase
      .from('exhibitors')
      .select(`
        *,
        exhibitor_services (
          water_connections,
          power_option,
          light_points,
          construction_booked,
          carpet_included
        )
      `)
      .eq('event_id', eventId)
      .order('name');

    if (!error && data) {
      setExhibitors(data as Exhibitor[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('exhibitors')
          .update({
            name: form.name,
            contact_name: form.contact_name || null,
            email: form.email || null,
            phone: form.phone || null,
            vat: form.vat || null,
            notes: form.notes || null,
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({ title: 'Opgeslagen', description: 'Exposant is bijgewerkt' });
      } else {
        const { error } = await supabase
          .from('exhibitors')
          .insert({
            event_id: eventId,
            name: form.name,
            contact_name: form.contact_name || null,
            email: form.email || null,
            phone: form.phone || null,
            vat: form.vat || null,
            notes: form.notes || null,
          });

        if (error) throw error;

        toast({ title: 'Aangemaakt', description: 'Exposant is toegevoegd' });
      }

      setDialogOpen(false);
      resetForm();
      fetchExhibitors();
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

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('exhibitors')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Kon niet verwijderen' });
    } else {
      toast({ title: 'Verwijderd', description: 'Exposant is verwijderd' });
      fetchExhibitors();
    }
    setDeleteId(null);
  };

  const openEdit = (exhibitor: Exhibitor) => {
    setEditingId(exhibitor.id);
    setForm({
      name: exhibitor.name,
      contact_name: exhibitor.contact_name || '',
      email: exhibitor.email || '',
      phone: exhibitor.phone || '',
      vat: exhibitor.vat || '',
      notes: exhibitor.notes || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', contact_name: '', email: '', phone: '', vat: '', notes: '' });
  };

  const getServicesBadges = (exhibitor: Exhibitor) => {
    const services = exhibitor.exhibitor_services;
    if (!services) return null;

    const badges = [];
    
    if (services.power_option && services.power_option !== 'NONE') {
      badges.push(
        <Badge key="power" variant="secondary" className="gap-1">
          <Zap className="w-3 h-3" />
          {powerLabels[services.power_option]}
        </Badge>
      );
    }
    
    if (services.water_connections > 0) {
      badges.push(
        <Badge key="water" variant="secondary" className="gap-1">
          <Droplets className="w-3 h-3" />
          {services.water_connections}x
        </Badge>
      );
    }
    
    if (services.light_points > 0) {
      badges.push(
        <Badge key="lights" variant="secondary" className="gap-1">
          <Lightbulb className="w-3 h-3" />
          {services.light_points}x
        </Badge>
      );
    }

    return badges.length > 0 ? badges : null;
  };

  const filteredExhibitors = exhibitors.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    ex.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate(`/events/${eventId}`)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Terug naar evenement
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Exposanten</h1>
          <p className="text-sm text-muted-foreground">{exhibitors.length} exposanten</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setInviteDialogOpen(true)}>
            <Send className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Uitnodigen</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Nieuwe exposant</span>
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek exposanten..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredExhibitors.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">Geen exposanten gevonden</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Probeer een andere zoekopdracht' : 'Voeg je eerste exposant toe'}
          </p>
          {!search && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe exposant
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExhibitors.map((exhibitor) => {
            const servicesBadges = getServicesBadges(exhibitor);
            
            return (
              <Card key={exhibitor.id} className="p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{exhibitor.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {exhibitor.contact_name && (
                          <span>{exhibitor.contact_name}</span>
                        )}
                        {exhibitor.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {exhibitor.email}
                          </span>
                        )}
                        {exhibitor.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {exhibitor.phone}
                          </span>
                        )}
                      </div>
                      {servicesBadges && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {servicesBadges}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setServicesExhibitor({ id: exhibitor.id, name: exhibitor.name })}
                      title="Services beheren"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(exhibitor)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(exhibitor.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Exposant bewerken' : 'Nieuwe exposant'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bedrijfsnaam *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contactpersoon</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoon</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat">BTW-nummer</Label>
              <Input
                id="vat"
                value={form.vat}
                onChange={(e) => setForm({ ...form, vat: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Opslaan' : 'Toevoegen'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Services Dialog */}
      {servicesExhibitor && (
        <ExhibitorServicesDialog
          open={!!servicesExhibitor}
          onOpenChange={(open) => {
            if (!open) {
              setServicesExhibitor(null);
              fetchExhibitors(); // Refresh to show updated badges
            }
          }}
          exhibitorId={servicesExhibitor.id}
          exhibitorName={servicesExhibitor.name}
        />
      )}

      {/* Invite Dialog */}
      {eventId && (
        <ExhibitorInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          eventId={eventId}
          exhibitors={exhibitors.map((e) => ({ id: e.id, name: e.name, email: e.email }))}
          onInviteSent={fetchExhibitors}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exposant verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Alle gekoppelde services worden ook verwijderd.
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
