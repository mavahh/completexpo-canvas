// Permission system type definitions

export type SystemRole = 'ADMIN' | 'MANAGER' | 'BUILDER';
export type EventRole = 'ADMIN' | 'USER';

export interface GlobalModuleVisibility {
  DASHBOARD: boolean;
  EVENTS: boolean;
  USERS: boolean;
  SETTINGS: boolean;
  CRM: boolean;
}

export interface EventPermissions {
  EVENTS_VIEW: boolean;
  EVENTS_MANAGE: boolean;
  FLOORPLAN_VIEW: boolean;
  FLOORPLAN_EDIT: boolean;
  EXHIBITORS_VIEW: boolean;
  EXHIBITORS_MANAGE: boolean;
  REQUESTS_VIEW: boolean;
  REQUESTS_MANAGE: boolean;
  SETTINGS_VIEW: boolean;
  SETTINGS_MANAGE: boolean;
  USERS_VIEW: boolean;
  USERS_MANAGE: boolean;
  EXPORT_VIEW: boolean;
  EXPORT_USE: boolean;
}

export interface TileVisibility {
  handbook: boolean;
  floorplan: boolean;
  orders: boolean;
  exhibitors: boolean;
  requests: boolean;
  messages: boolean;
  partnerships: boolean;
  settings: boolean;
  users: boolean;
  credits: boolean;
}

export interface UserPermissions {
  loading: boolean;
  systemRole: SystemRole | null;
  permissions: string[];
  globalModuleVisibility: GlobalModuleVisibility;
  hasPermission: (permission: string) => boolean;
  hasEventPermission: (eventId: string, permission: string) => Promise<boolean>;
  isTileVisible: (eventId: string, tileName: string) => Promise<boolean>;
  isModuleVisible: (moduleName: keyof GlobalModuleVisibility) => boolean;
  isSystemAdmin: boolean;
  refetch: () => Promise<void>;
}

export interface EventMembership {
  role: EventRole;
  permissionsOverride: Partial<EventPermissions> | null;
  visibleTiles: Partial<TileVisibility> | null;
}

export interface EventPermissionsResult {
  loading: boolean;
  membership: EventMembership | null;
  isSystemAdmin: boolean;
  hasPermission: (permission: keyof EventPermissions) => boolean;
  isTileVisible: (tileName: keyof TileVisibility) => boolean;
  isMember: boolean;
}
