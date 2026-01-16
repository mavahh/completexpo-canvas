import {
  Calendar,
  LayoutGrid,
  Users,
  FileText,
  Settings,
  BarChart3,
  CreditCard,
  Contact,
  type LucideIcon,
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  requiresEvent: boolean;
  buildHref: (eventId: string | null) => string;
  requiredPermission: string | null;
  requiredModuleVisibility?: string;
  comingSoon?: boolean;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'events',
    title: 'Beursbeheer',
    description: 'Beheer al je evenementen en beurzen',
    icon: Calendar,
    requiresEvent: false,
    buildHref: () => '/events',
    requiredPermission: 'EVENTS_VIEW',
    requiredModuleVisibility: 'EVENTS',
  },
  {
    id: 'floorplan',
    title: 'Plattegrond',
    description: 'Ontwerp en beheer je beursplattegronden',
    icon: LayoutGrid,
    requiresEvent: true,
    buildHref: (eventId) => `/events/${eventId}/floorplan`,
    requiredPermission: 'FLOORPLAN_VIEW',
  },
  {
    id: 'exhibitors',
    title: 'Exposanten',
    description: 'Beheer deelnemers en standhouders',
    icon: Users,
    requiresEvent: true,
    buildHref: (eventId) => `/events/${eventId}/exhibitors`,
    requiredPermission: 'EXHIBITORS_VIEW',
  },
  {
    id: 'requests',
    title: 'Aanvragen',
    description: 'Bekijk en verwerk standaanvragen',
    icon: FileText,
    requiresEvent: true,
    buildHref: (eventId) => `/events/${eventId}/requests`,
    requiredPermission: 'REQUESTS_VIEW',
  },
  {
    id: 'settings',
    title: 'Instellingen',
    description: 'Configureer event-specifieke opties',
    icon: Settings,
    requiresEvent: true,
    buildHref: (eventId) => `/events/${eventId}/settings`,
    requiredPermission: 'SETTINGS_VIEW',
    requiredModuleVisibility: 'SETTINGS',
  },
  {
    id: 'insights',
    title: 'Rapportages',
    description: 'Bekijk statistieken en rapportages',
    icon: BarChart3,
    requiresEvent: true,
    buildHref: (eventId) => `/dashboard?event=${eventId}`,
    requiredPermission: 'EVENTS_VIEW',
    requiredModuleVisibility: 'DASHBOARD',
  },
  {
    id: 'pos',
    title: 'Kassa',
    description: 'Point of Sale en kassabeheer',
    icon: CreditCard,
    requiresEvent: true,
    buildHref: (eventId) => `/events/${eventId}/pos`,
    requiredPermission: 'POS_VIEW',
  },
  {
    id: 'crm',
    title: 'CRM',
    description: 'Relatiebeheer en communicatie',
    icon: Contact,
    requiresEvent: false,
    buildHref: () => '/crm',
    requiredPermission: null,
    requiredModuleVisibility: 'CRM',
    comingSoon: true,
  },
];

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: (eventId: string | null) => string;
  requiresEvent: boolean;
  requiredPermission: string | null;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-event',
    title: 'Nieuw event',
    description: 'Maak een nieuw evenement aan',
    icon: Calendar,
    href: () => '/events/new',
    requiresEvent: false,
    requiredPermission: 'EVENTS_MANAGE',
  },
  {
    id: 'invite-team',
    title: 'Teamlid uitnodigen',
    description: 'Nodig een nieuw teamlid uit',
    icon: Users,
    href: (eventId) => eventId ? `/events/${eventId}/users` : '/team',
    requiresEvent: false,
    requiredPermission: 'USERS_VIEW',
  },
  {
    id: 'import-background',
    title: 'Achtergrond importeren',
    description: 'Upload een plattegrond afbeelding',
    icon: LayoutGrid,
    href: (eventId) => `/events/${eventId}/floorplan?action=background`,
    requiresEvent: true,
    requiredPermission: 'FLOORPLAN_EDIT',
  },
];
