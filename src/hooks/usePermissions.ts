// Re-export all permission types, constants, and hooks from the new modular structure
// This maintains backward compatibility with existing imports

export type {
  SystemRole,
  EventRole,
  GlobalModuleVisibility,
  EventPermissions,
  TileVisibility,
  UserPermissions,
  EventMembership,
  EventPermissionsResult,
} from './permissions';

export {
  DEFAULT_PERMISSIONS,
  DEFAULT_MODULE_VISIBILITY,
  DEFAULT_TILES,
  DEFAULT_GLOBAL_MODULE_VISIBILITY,
  usePermissions,
  useEventPermissions,
} from './permissions';
