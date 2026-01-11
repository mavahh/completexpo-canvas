// Permission system constants and defaults

import type { 
  SystemRole, 
  EventPermissions, 
  GlobalModuleVisibility, 
  TileVisibility 
} from './types';

/**
 * Default permissions per system role
 */
export const DEFAULT_PERMISSIONS: Record<SystemRole, Partial<EventPermissions>> = {
  ADMIN: {
    EVENTS_VIEW: true,
    EVENTS_MANAGE: true,
    FLOORPLAN_VIEW: true,
    FLOORPLAN_EDIT: true,
    EXHIBITORS_VIEW: true,
    EXHIBITORS_MANAGE: true,
    REQUESTS_VIEW: true,
    REQUESTS_MANAGE: true,
    SETTINGS_VIEW: true,
    SETTINGS_MANAGE: true,
    USERS_VIEW: true,
    USERS_MANAGE: true,
    EXPORT_VIEW: true,
    EXPORT_USE: true,
  },
  MANAGER: {
    EVENTS_VIEW: true,
    EVENTS_MANAGE: true,
    FLOORPLAN_VIEW: true,
    FLOORPLAN_EDIT: true,
    EXHIBITORS_VIEW: true,
    EXHIBITORS_MANAGE: true,
    REQUESTS_VIEW: true,
    REQUESTS_MANAGE: true,
    SETTINGS_VIEW: true,
    SETTINGS_MANAGE: true,
    USERS_VIEW: true,
    USERS_MANAGE: false,
    EXPORT_VIEW: true,
    EXPORT_USE: true,
  },
  BUILDER: {
    EVENTS_VIEW: true,
    EVENTS_MANAGE: false,
    FLOORPLAN_VIEW: true,
    FLOORPLAN_EDIT: false,
    EXHIBITORS_VIEW: true,
    EXHIBITORS_MANAGE: false,
    REQUESTS_VIEW: false,
    REQUESTS_MANAGE: false,
    SETTINGS_VIEW: false,
    SETTINGS_MANAGE: false,
    USERS_VIEW: false,
    USERS_MANAGE: false,
    EXPORT_VIEW: false,
    EXPORT_USE: false,
  },
};

/**
 * Default module visibility per role
 */
export const DEFAULT_MODULE_VISIBILITY: Record<SystemRole, GlobalModuleVisibility> = {
  ADMIN: {
    DASHBOARD: true,
    EVENTS: true,
    USERS: true,
    SETTINGS: true,
    CRM: true,
  },
  MANAGER: {
    DASHBOARD: true,
    EVENTS: true,
    USERS: false,
    SETTINGS: true,
    CRM: true,
  },
  BUILDER: {
    DASHBOARD: true,
    EVENTS: true,
    USERS: false,
    SETTINGS: false,
    CRM: false,
  },
};

/**
 * Default tiles (all visible by default for event members)
 */
export const DEFAULT_TILES: TileVisibility = {
  handbook: true,
  floorplan: true,
  orders: true,
  exhibitors: true,
  requests: true,
  messages: true,
  partnerships: true,
  settings: true,
  users: true,
  credits: true,
};

/**
 * Default global module visibility for unauthenticated/new users
 */
export const DEFAULT_GLOBAL_MODULE_VISIBILITY: GlobalModuleVisibility = {
  DASHBOARD: true,
  EVENTS: true,
  USERS: false,
  SETTINGS: false,
  CRM: false,
};
