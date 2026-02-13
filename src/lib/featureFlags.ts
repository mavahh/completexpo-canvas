/**
 * Feature flags for the application.
 * Set via environment variables (VITE_FEATURE_*) or defaults.
 */

export const FEATURES = {
  /** POS / kassa module - set VITE_FEATURE_POS=true to enable */
  POS: import.meta.env.VITE_FEATURE_POS === 'true',

  /** CRM module */
  CRM: false,
} as const;
