import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions, SystemRole, GlobalModuleVisibility, DEFAULT_MODULE_VISIBILITY } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Shield, Calendar, Eye, Edit, Save, Plus, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  global_module_visibility: GlobalModuleVisibility | null;
}

interface UserRole {
  role: SystemRole;
}

interface Event {
  id: string;
  name: string;
  start_date: string | null;
  location: string | null;
}

interface EventMembership {
  id: string;
  event_id: string;
  role: 'ADMIN' | 'USER';
  permissions_override: Record<string, boolean> | null;
  visible_tiles: Record<string, boolean> | null;
  event?: Event;
}

const MODULES: { key: keyof GlobalModuleVisibility; label: string }[] = [
  { key: 'DASHBOARD', label: 'Dashboard' },
  { key: 'EVENTS', label: 'Evenementen' },
  { key: 'USERS', label: 'Gebruikers' },
  { key: 'SETTINGS', label: 'Instellingen' },
  { key: 'CRM', label: 'CRM' },
];

const PERMISSIONS = [
  { key: 'FLOORPLAN_VIEW', label: 'Plattegrond bekijken', category: 'Plattegrond' },
  { key: 'FLOORPLAN_EDIT', label: 'Plattegrond bewerken', category: 'Plattegrond' },
  { key: 'EXHIBITORS_VIEW', label: 'Exposanten bekijken', category: 'Exposanten' },
  { key: 'EXHIBITORS_MANAGE', label: 'Exposanten beheren', category: 'Exposanten' },
  { key: 'REQUESTS_VIEW', label: 'Aanvragen bekijken', category: 'Aanvragen' },
  { key: 'REQUESTS_MANAGE', label: 'Aanvragen verwerken', category: 'Aanvragen' },
  { key: 'SETTINGS_VIEW', label: 'Instellingen bekijken', category: 'Instellingen' },
  { key: 'SETTINGS_MANAGE', label: 'Instellingen beheren', category: 'Instellingen' },
  { key: 'USERS_VIEW', label: 'Gebruikers bekijken', category: 'Gebruikers' },
  { key: 'USERS_MANAGE', label: 'Gebruikers beheren', category: 'Gebruikers' },
  { key: 'EXPORT_VIEW', label: 'Exports bekijken', category: 'Export' },
  { key: 'EXPORT_USE', label: 'Exports maken', category: 'Export' },
];

const TILES = [
  { key: 'handbook', label: 'Handboek' },
  { key: 'floorplan', label: 'Plattegrond' },
  { key: 'orders', label: 'Bestellingen' },
  { key: 'exhibitors', label: 'Exposanten' },
  { key: 'requests', label: 'Aanvragen' },
  { key: 'messages', label: 'Berichten' },
  { key: 'partnerships', label: 'Partners' },
  { key: 'settings', label: 'Instellingen' },
  { key: 'users', label: 'Toegang' },
  { key: 'credits', label: 'Credits' },
];

const ROLE_LABELS: Record<SystemRole, { label: string; color: string }> = {
  ADMIN: { label: 'Administrator', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  MANAGER: { label: 'Manager', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  BUILDER: { label: 'Bouwer', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
};

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission, isSystemAdmin } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [systemRole, setSystemRole] = useState<SystemRole | null>(null);
  const [moduleVisibility, setModuleVisibility] = useState<GlobalModuleVisibility>(
    DEFAULT_MODULE_VISIBILITY.BUILDER
  );
  const [memberships, setMemberships] = useState<EventMembership[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [addingEvent, setAddingEvent] = useState(false);
  const [selectedEventToAdd, setSelectedEventToAdd] = useState<string>('');

  useEffect(() => {
    if (!userId) return;
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setUser({
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        global_module_visibility: profileData.global_module_visibility as unknown as GlobalModuleVisibility | null,
      });

      if (profileData.global_module_visibility) {
        setModuleVisibility(profileData.global_module_visibility as unknown as GlobalModuleVisibility);
      }

      // Fetch system role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      setSystemRole(roleData?.role as SystemRole || null);

      // Fetch event memberships
      const { data: membershipData } = await supabase
        .from('event_members')
        .select('id, event_id, role, permissions_override, visible_tiles')
        .eq('user_id', userId);

      if (membershipData && membershipData.length > 0) {
        // Fetch event details for each membership
        const eventIds = membershipData.map(m => m.event_id);
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, name, start_date, location')
          .in('id', eventIds);

        const membershipsWithEvents = membershipData.map(m => ({
          ...m,
          permissions_override: m.permissions_override as Record<string, boolean> | null,
          visible_tiles: m.visible_tiles as Record<string, boolean> | null,
          event: eventsData?.find(e => e.id === m.event_id),
        }));

        setMemberships(membershipsWithEvents);
      }

      // Fetch all events (for adding new memberships)
      const { data: allEventsData } = await supabase
        .from('events')
        .select('id, name, start_date, location')
        .order('start_date', { ascending: false });

      setAllEvents(allEventsData || []);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (newRole: SystemRole | 'none') => {
    if (!userId) return;
    setSaving(true);

    try {
      if (newRole === 'none') {
        await supabase.from('user_roles').delete().eq('user_id', userId);
        setSystemRole(null);
      } else {
        // Upsert role
        const { data: existing } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existing) {
          await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', userId);
        } else {
          await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: newRole });
        }
        setSystemRole(newRole);

        // Update module visibility to role defaults if not customized
        setModuleVisibility(DEFAULT_MODULE_VISIBILITY[newRole]);
      }

      toast({ title: 'Opgeslagen', description: 'Systeemrol is bijgewerkt' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModuleVisibility = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      await supabase
        .from('profiles')
        .update({ global_module_visibility: moduleVisibility as unknown as Record<string, boolean> })
        .eq('id', userId);

      toast({ title: 'Opgeslagen', description: 'Module zichtbaarheid is bijgewerkt' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddEventMembership = async () => {
    if (!userId || !selectedEventToAdd) return;
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('event_members')
        .insert({
          user_id: userId,
          event_id: selectedEventToAdd,
          role: 'USER',
        })
        .select()
        .single();

      if (error) throw error;

      const event = allEvents.find(e => e.id === selectedEventToAdd);
      setMemberships([...memberships, {
        ...data,
        permissions_override: null,
        visible_tiles: null,
        event,
      }]);
      setAddingEvent(false);
      setSelectedEventToAdd('');

      toast({ title: 'Toegevoegd', description: 'Gebruiker heeft nu toegang tot het evenement' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    setSaving(true);

    try {
      await supabase.from('event_members').delete().eq('id', membershipId);
      setMemberships(memberships.filter(m => m.id !== membershipId));
      toast({ title: 'Verwijderd', description: 'Toegang tot evenement is verwijderd' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMembership = async (
    membershipId: string,
    updates: Partial<Pick<EventMembership, 'role' | 'permissions_override' | 'visible_tiles'>>
  ) => {
    setSaving(true);

    try {
      await supabase
        .from('event_members')
        .update(updates)
        .eq('id', membershipId);

      setMemberships(memberships.map(m =>
        m.id === membershipId ? { ...m, ...updates } : m
      ));

      toast({ title: 'Opgeslagen', description: 'Rechten zijn bijgewerkt' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const togglePermissionOverride = (
    membership: EventMembership,
    permKey: string,
    currentValue: boolean | undefined
  ) => {
    const newOverrides = { ...membership.permissions_override };
    
    if (currentValue === undefined) {
      // Set explicit value
      newOverrides[permKey] = true;
    } else if (currentValue === true) {
      newOverrides[permKey] = false;
    } else {
      // Remove override (use default)
      delete newOverrides[permKey];
    }

    handleUpdateMembership(membership.id, {
      permissions_override: Object.keys(newOverrides).length > 0 ? newOverrides : null,
    });
  };

  const toggleTileVisibility = (
    membership: EventMembership,
    tileKey: string,
    currentValue: boolean | undefined
  ) => {
    const newTiles = { ...membership.visible_tiles };
    
    if (currentValue === undefined || currentValue === true) {
      newTiles[tileKey] = false;
    } else {
      delete newTiles[tileKey]; // Remove to use default (visible)
    }

    handleUpdateMembership(membership.id, {
      visible_tiles: Object.keys(newTiles).length > 0 ? newTiles : null,
    });
  };

  if (!hasPermission('USERS_MANAGE') && !isSystemAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Je hebt geen toegang tot deze pagina.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Gebruiker niet gevonden.</p>
      </div>
    );
  }

  const availableEventsToAdd = allEvents.filter(
    e => !memberships.some(m => m.event_id === e.id)
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/users')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Terug naar gebruikers
      </Button>

      {/* User header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{user.name || user.email}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
            {systemRole && (
              <Badge className={ROLE_LABELS[systemRole].color}>
                {ROLE_LABELS[systemRole].label}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Section A: System Role */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Systeemrol
          </CardTitle>
          <CardDescription>
            Bepaalt de standaard rechten van deze gebruiker
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={systemRole || 'none'}
            onValueChange={(value) => handleSaveRole(value as SystemRole | 'none')}
            disabled={saving}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecteer rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Geen systeemrol</SelectItem>
              <SelectItem value="ADMIN">Administrator</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="BUILDER">Bouwer</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Section B: Global Module Visibility */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Globale tabs
          </CardTitle>
          <CardDescription>
            Welke hoofdtabs zijn zichtbaar voor deze gebruiker
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {MODULES.map((module) => (
              <div key={module.key} className="flex items-center space-x-2">
                <Checkbox
                  id={`module-${module.key}`}
                  checked={moduleVisibility[module.key]}
                  onCheckedChange={(checked) =>
                    setModuleVisibility({ ...moduleVisibility, [module.key]: !!checked })
                  }
                />
                <Label htmlFor={`module-${module.key}`}>{module.label}</Label>
              </div>
            ))}
          </div>
          <Button onClick={handleSaveModuleVisibility} disabled={saving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Opslaan
          </Button>
        </CardContent>
      </Card>

      {/* Section C: Event Access */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Evenement toegang
              </CardTitle>
              <CardDescription>
                Aan welke evenementen heeft deze gebruiker toegang
              </CardDescription>
            </div>
            {availableEventsToAdd.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingEvent(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Evenement toevoegen
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {addingEvent && (
            <div className="flex items-center gap-2 mb-4 p-4 bg-muted rounded-lg">
              <Select value={selectedEventToAdd} onValueChange={setSelectedEventToAdd}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecteer evenement" />
                </SelectTrigger>
                <SelectContent>
                  {availableEventsToAdd.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddEventMembership} disabled={!selectedEventToAdd || saving}>
                Toevoegen
              </Button>
              <Button variant="ghost" onClick={() => { setAddingEvent(false); setSelectedEventToAdd(''); }}>
                Annuleren
              </Button>
            </div>
          )}

          {memberships.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Geen evenement toegang geconfigureerd
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {memberships.map((membership) => (
                <AccordionItem key={membership.id} value={membership.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{membership.event?.name || 'Onbekend evenement'}</span>
                      <Badge variant="secondary" className="text-xs">
                        {membership.role === 'ADMIN' ? 'Event Admin' : 'Gebruiker'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6">
                    <div className="space-y-6">
                      {/* Event Role */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Event rol</Label>
                        <Select
                          value={membership.role}
                          onValueChange={(value) => 
                            handleUpdateMembership(membership.id, { role: value as 'ADMIN' | 'USER' })
                          }
                          disabled={saving}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Event Admin</SelectItem>
                            <SelectItem value="USER">Gebruiker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Permission Overrides */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Rechten overrides
                          <span className="text-xs text-muted-foreground ml-2">
                            (Klik om te wisselen: ✓ = aan, ✗ = uit, - = standaard)
                          </span>
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {PERMISSIONS.map((perm) => {
                            const overrideValue = membership.permissions_override?.[perm.key];
                            const isOverridden = overrideValue !== undefined;
                            
                            return (
                              <button
                                key={perm.key}
                                onClick={() => togglePermissionOverride(membership, perm.key, overrideValue)}
                                className={`flex items-center gap-2 p-2 rounded text-sm text-left transition-colors ${
                                  isOverridden
                                    ? overrideValue
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                                disabled={saving}
                              >
                                <span className="w-4 text-center">
                                  {isOverridden ? (overrideValue ? '✓' : '✗') : '-'}
                                </span>
                                <span className="truncate">{perm.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tile Visibility */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Zichtbare tiles</Label>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                          {TILES.map((tile) => {
                            const isHidden = membership.visible_tiles?.[tile.key] === false;
                            
                            return (
                              <button
                                key={tile.key}
                                onClick={() => toggleTileVisibility(
                                  membership,
                                  tile.key,
                                  membership.visible_tiles?.[tile.key]
                                )}
                                className={`p-2 rounded text-sm transition-colors ${
                                  isHidden
                                    ? 'bg-muted text-muted-foreground line-through'
                                    : 'bg-primary/10 text-primary'
                                }`}
                                disabled={saving}
                              >
                                {tile.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Remove button */}
                      <div className="pt-4 border-t">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveMembership(membership.id)}
                          disabled={saving}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Toegang verwijderen
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
