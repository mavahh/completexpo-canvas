import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  User,
  FileText,
  Edit,
  Trash2,
  Copy,
  Library,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ExhibitorLibraryEntry {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  vat: string | null;
  notes: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function ExhibitorLibrary() {
  const { toast } = useToast();
  const { account, loading: authLoading } = useMultiTenant();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ExhibitorLibraryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ExhibitorLibraryEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    vat: '',
    notes: '',
  });

  const fetchEntries = useCallback(async () => {
    if (!account?.id) return;

    try {
      const { data, error } = await supabase
        .from('exhibitor_library')
        .select('*')
        .eq('account_id', account.id)
        .order('name');

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout bij laden',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [account?.id, toast]);

  useEffect(() => {
    if (account?.id) {
      fetchEntries();
    }
  }, [account?.id, fetchEntries]);

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      email: '',
      phone: '',
      vat: '',
      notes: '',
    });
    setSelectedEntry(null);
  };

  const openEdit = (entry: ExhibitorLibraryEntry) => {
    setSelectedEntry(entry);
    setFormData({
      name: entry.name,
      contact_name: entry.contact_name || '',
      email: entry.email || '',
      phone: entry.phone || '',
      vat: entry.vat || '',
      notes: entry.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.id) return;

    setSaving(true);
    try {
      if (selectedEntry) {
        // Update
        const { error } = await supabase
          .from('exhibitor_library')
          .update({
            name: formData.name,
            contact_name: formData.contact_name || null,
            email: formData.email || null,
            phone: formData.phone || null,
            vat: formData.vat || null,
            notes: formData.notes || null,
          })
          .eq('id', selectedEntry.id);

        if (error) throw error;

        toast({
          title: 'Opgeslagen',
          description: 'Exposant bijgewerkt in bibliotheek.',
        });
      } else {
        // Create
        const { error } = await supabase.from('exhibitor_library').insert({
          account_id: account.id,
          name: formData.name,
          contact_name: formData.contact_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          vat: formData.vat || null,
          notes: formData.notes || null,
        });

        if (error) throw error;

        toast({
          title: 'Toegevoegd',
          description: 'Exposant toegevoegd aan bibliotheek.',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchEntries();
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
    if (!selectedEntry) return;

    try {
      const { error } = await supabase
        .from('exhibitor_library')
        .delete()
        .eq('id', selectedEntry.id);

      if (error) throw error;

      toast({
        title: 'Verwijderd',
        description: 'Exposant verwijderd uit bibliotheek.',
      });

      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      fetchEntries();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout',
        description: error.message,
      });
    }
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Je moet gekoppeld zijn aan een account.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Library className="w-6 h-6" />
            Exposanten Bibliotheek
          </h1>
          <p className="text-muted-foreground">
            Beheer bedrijfsprofielen die je kan hergebruiken over meerdere events
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {selectedEntry ? 'Exposant bewerken' : 'Nieuwe exposant'}
                </DialogTitle>
                <DialogDescription>
                  {selectedEntry
                    ? 'Werk de gegevens van deze exposant bij.'
                    : 'Voeg een nieuw bedrijfsprofiel toe aan je bibliotheek.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Bedrijfsnaam *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Bedrijf B.V."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contactpersoon</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="Jan Jansen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@bedrijf.nl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoon</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+31 6 12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vat">BTW-nummer</Label>
                    <Input
                      id="vat"
                      value={formData.vat}
                      onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                      placeholder="NL123456789B01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notities</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Interne opmerkingen over deze exposant..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {selectedEntry ? 'Opslaan' : 'Toevoegen'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, contact of e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Library className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'Geen resultaten' : 'Nog geen exposanten'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Probeer een andere zoekterm.'
                : 'Voeg je eerste bedrijfsprofiel toe om te beginnen.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Eerste exposant toevoegen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bedrijf</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefoon</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    {entry.vat && (
                      <span className="text-xs text-muted-foreground ml-6">{entry.vat}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.contact_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {entry.contact_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {entry.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {entry.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(entry)}
                        title="Bewerken"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setDeleteDialogOpen(true);
                        }}
                        title="Verwijderen"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Stats */}
      <div className="mt-6 text-sm text-muted-foreground">
        {filteredEntries.length} van {entries.length} exposanten
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exposant verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{selectedEntry?.name}" wilt verwijderen uit je bibliotheek?
              Dit heeft geen effect op bestaande events waar deze exposant aan gekoppeld is.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
