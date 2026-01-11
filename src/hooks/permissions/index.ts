// Permission system barrel export
// This file re-exports all permission-related types, constants, and hooks

// Types
export type {
  SystemRole,
  EventRole,
  GlobalModuleVisibility,
  EventPermissions,
  TileVisibility,
  UserPermissions,
  EventMembership,
  EventPermissionsResult,
} from './types';

// Constants
export {
  DEFAULT_PERMISSIONS,
  DEFAULT_MODULE_VISIBILITY,
  DEFAULT_TILES,
  DEFAULT_GLOBAL_MODULE_VISIBILITY,
} from './constants';

// Hooks
export { usePermissions } from './usePermissions';
export { useEventPermissions } from './useEventPermissions';
