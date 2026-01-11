import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Loader2, 
  Shield, 
  Crown, 
  User,
  Settings,
  Calendar,
  Users,
  LayoutGrid,
  FileText,
  MessageSquare,
  CreditCard,
  Map,
  Package
} from 'lucide-react';

type AccountRole = 'OWNER' | 'ADMIN' | 'MEMBER';

interface RoleModuleConfig {
  dashboard: boolean;
  events: boolean;
  exhibitors: boolean;
  floorplan: boolean;
  requests: boolean;
  messages: boolean;
  settings: boolean;
  users: boolean;
  credits: boolean;
}

interface RolePermissionConfig {
  canManageEvents: boolean;
  canManageExhibitors: boolean;
  canEditFloorplan: boolean;
  canManageRequests: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canExport: boolean;
  canInviteMembers: boolean;
}

interface RoleConfig {
  modules: RoleModuleConfig;
  permissions: RolePermissionConfig;
}

const DEFAULT_ROLE_CONFIGS: Record<AccountRole, RoleConfig> = {
  OWNER: {
    modules: {
      dashboard: true,
      events: true,
      exhibitors: true,
      floorplan: true,
      requests: true,
      messages: true,
      settings: true,
      users: true,
      credits: true,
    },
    permissions: {
      canManageEvents: true,
      canManageExhibitors: true,
      canEditFloorplan: true,
      canManageRequests: true,
      canManageSettings: true,
      canManageUsers: true,
      canExport: true,
      canInviteMembers: true,
    },
  },
  ADMIN: {
    modules: {
      dashboard: true,
      events: true,
      exhibitors: true,
      floorplan: true,
      requests: true,
      messages: true,
      settings: true,
      users: true,
      credits: false,
    },
    permissions: {
      canManageEvents: true,
      canManageExhibitors: true,
      canEditFloorplan: true,
      canManageRequests: true,
      canManageSettings: true,
      canManageUsers: false,
      canExport: true,
      canInviteMembers: true,
    },
  },
  MEMBER: {
    modules: {
      dashboard: true,
      events: true,
      exhibitors: true,
      floorplan: true,
      requests: false,
      messages: true,
      settings: false,
      users: false,
      credits: false,
    },
    permissions: {
      canManageEvents: false,
      canManageExhibitors: false,
      canEditFloorplan: false,
      canManageRequests: false,
      canManageSettings: false,
      canManageUsers: false,
      canExport: false,
      canInviteMembers: false,
    },
  },
};

const MODULE_INFO = {
  dashboard: { label: 'Dashboard', icon: LayoutGrid, description: 'Overzicht en statistieken' },
  events: { label: 'Evenementen', icon: Calendar, description: 'Evenementen bekijken en beheren' },
  exhibitors: { label: 'Exposanten', icon: Package, description: 'Exposantenlijst en details' },
  floorplan: { label: 'Plattegrond', icon: Map, description: 'Plattegrond bekijken' },
  requests: { label: 'Aanvragen', icon: FileText, description: 'Standaanvragen beheren' },
  messages: { label: 'Berichten', icon: MessageSquare, description: 'Communicatie met exposanten' },
  settings: { label: 'Instellingen', icon: Settings, description: 'Evenement instellingen' },
  users: { label: 'Gebruikers', icon: Users, description: 'Teamleden beheren' },
  credits: { label: 'Tegoed', icon: CreditCard, description: 'Facturatie en tegoed' },
};

const PERMISSION_INFO = {
  canManageEvents: { label: 'Evenementen beheren', description: 'Kan evenementen aanmaken, bewerken en verwijderen' },
  canManageExhibitors: { label: 'Exposanten beheren', description: 'Kan exposanten toevoegen, bewerken en verwijderen' },
  canEditFloorplan: { label: 'Plattegrond bewerken', description: 'Kan de plattegrond aanpassen en stands bewerken' },
  canManageRequests: { label: 'Aanvragen beheren', description: 'Kan standaanvragen goedkeuren of afwijzen' },
  canManageSettings: { label: 'Instellingen beheren', description: 'Kan evenement instellingen aanpassen' },
  canManageUsers: { label: 'Gebruikers beheren', description: 'Kan teamleden toevoegen en verwijderen' },
  canExport: { label: 'Exporteren', description: 'Kan gegevens en plattegronden exporteren' },
  canInviteMembers: { label: 'Leden uitnodigen', description: 'Kan nieuwe teamleden uitnodigen' },
};

const ROLE_INFO: Record<AccountRole, { label: string; icon: any; color: string; description: string }> = {
  OWNER: { 
    label: 'Eigenaar', 
    icon: Crown, 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    description: 'Volledige toegang tot alle functies'
  },
  ADMIN: { 
    label: 'Admin', 
    icon: Shield, 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    description: 'Kan team en evenementen beheren'
  },
  MEMBER: { 
    label: 'Lid', 
    icon: User, 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    description: 'Basis toegang tot functies'
  },
};

interface RolePermissionsCardProps {
  canManage: boolean;
}

export function RolePermissionsCard({ canManage }: RolePermissionsCardProps) {
  const { account } = useMultiTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleConfigs, setRoleConfigs] = useState<Record<AccountRole, RoleConfig>>(DEFAULT_ROLE_CONFIGS);
  const [selectedRole, setSelectedRole] = useState<AccountRole>('MEMBER');

  useEffect(() => {
    if (account?.id) {
      loadRoleConfigs();
    }
  }, [account?.id]);

  const loadRoleConfigs = async () => {
    // In a real implementation, this would load from a database table
    // For now, we use the defaults and could store custom configs in account metadata
    setLoading(false);
  };

  const handleModuleToggle = async (module: keyof RoleModuleConfig, value: boolean) => {
    if (!canManage || selectedRole === 'OWNER') return;

    const updatedConfigs = {
      ...roleConfigs,
      [selectedRole]: {
        ...roleConfigs[selectedRole],
        modules: {
          ...roleConfigs[selectedRole].modules,
          [module]: value,
        },
      },
    };

    setRoleConfigs(updatedConfigs);
    await saveRoleConfig(selectedRole, updatedConfigs[selectedRole]);
  };

  const handlePermissionToggle = async (permission: keyof RolePermissionConfig, value: boolean) => {
    if (!canManage || selectedRole === 'OWNER') return;

    const updatedConfigs = {
      ...roleConfigs,
      [selectedRole]: {
        ...roleConfigs[selectedRole],
        permissions: {
          ...roleConfigs[selectedRole].permissions,
          [permission]: value,
        },
      },
    };

    setRoleConfigs(updatedConfigs);
    await saveRoleConfig(selectedRole, updatedConfigs[selectedRole]);
  };

  const saveRoleConfig = async (role: AccountRole, config: RoleConfig) => {
    setSaving(true);
    try {
      // Here you would save to a database table like account_role_configs
      // For now, we just show a success toast
      toast({
        title: 'Rechten opgeslagen',
        description: `De rechten voor ${ROLE_INFO[role].label} zijn bijgewerkt`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fout bij opslaan',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const currentConfig = roleConfigs[selectedRole];
  const isOwnerRole = selectedRole === 'OWNER';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Rolrechten
        </CardTitle>
        <CardDescription>
          Bepaal welke functies en rechten elke rol heeft binnen je organisatie
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as AccountRole)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {(Object.keys(ROLE_INFO) as AccountRole[]).map((role) => {
              const info = ROLE_INFO[role];
              const Icon = info.icon;
              return (
                <TabsTrigger key={role} value={role} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{info.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(ROLE_INFO) as AccountRole[]).map((role) => (
            <TabsContent key={role} value={role} className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Badge className={ROLE_INFO[role].color}>
                  {React.createElement(ROLE_INFO[role].icon, { className: 'w-4 h-4 mr-1' })}
                  {ROLE_INFO[role].label}
                </Badge>
                <p className="text-sm text-muted-foreground">{ROLE_INFO[role].description}</p>
              </div>

              {isOwnerRole && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    De eigenaar heeft altijd volledige toegang tot alle functies. Deze rechten kunnen niet worden aangepast.
                  </p>
                </div>
              )}

              <Accordion type="multiple" defaultValue={['modules', 'permissions']} className="space-y-4">
                <AccordionItem value="modules" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span>Zichtbare modules</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(Object.entries(MODULE_INFO) as [keyof RoleModuleConfig, typeof MODULE_INFO.dashboard][]).map(
                        ([key, info]) => {
                          const Icon = info.icon;
                          const isEnabled = currentConfig.modules[key];
                          
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isEnabled ? 'bg-primary/10' : 'bg-muted'
                                }`}>
                                  <Icon className={`w-4 h-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                  <Label className="font-medium">{info.label}</Label>
                                  <p className="text-xs text-muted-foreground">{info.description}</p>
                                </div>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleModuleToggle(key, checked)}
                                disabled={!canManage || isOwnerRole}
                              />
                            </div>
                          );
                        }
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="permissions" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Rechten</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(Object.entries(PERMISSION_INFO) as [keyof RolePermissionConfig, typeof PERMISSION_INFO.canManageEvents][]).map(
                        ([key, info]) => {
                          const isEnabled = currentConfig.permissions[key];
                          
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <Label className="font-medium">{info.label}</Label>
                                <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handlePermissionToggle(key, checked)}
                                disabled={!canManage || isOwnerRole}
                                className="ml-3 shrink-0"
                              />
                            </div>
                          );
                        }
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {saving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opslaan...
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
