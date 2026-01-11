// Centralized type definitions for the application
// These types are used across multiple components and pages
// NOTE: We use "AppEvent" to avoid conflict with the native DOM Event type

import { StandStatus } from '@/components/floorplan/StandLegend';
import type { Database } from '@/integrations/supabase/types';

// Re-export StandStatus for convenience
export type { StandStatus } from '@/components/floorplan/StandLegend';

// Power option enum from database
export type PowerOption = Database['public']['Enums']['power_option'];

// Surface type enum from database
export type SurfaceType = Database['public']['Enums']['surface_type'];

// =============================================================================
// STAND
// =============================================================================

/**
 * Base stand properties shared across all contexts
 */
export interface StandBase {
  id: string;
  floorplan_id: string;
  event_id: string;
  exhibitor_id: string | null;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string | null;
  notes: string | null;
  status: StandStatus;
}

/**
 * Full stand type used in FloorplanEditor and FloorplanCanvas
 */
export interface Stand extends StandBase {}

// =============================================================================
// FLOORPLAN
// =============================================================================

/**
 * Base floorplan properties
 */
export interface FloorplanBase {
  id: string;
  width: number;
  height: number;
  grid_size: number;
  background_url: string | null;
  background_opacity: number | null;
}

/**
 * Floorplan with minimal properties (used in FloorplanCanvas)
 */
export interface FloorplanMinimal extends FloorplanBase {}

/**
 * Full floorplan type with all properties
 */
export interface Floorplan extends FloorplanBase {
  event_id: string;
  name: string;
  hall: string | null;
}

// =============================================================================
// EXHIBITOR
// =============================================================================

/**
 * Minimal exhibitor info (used in selectors, references)
 */
export interface ExhibitorMinimal {
  id: string;
  name: string;
}

/**
 * Exhibitor with contact details
 */
export interface ExhibitorContact extends ExhibitorMinimal {
  contact_name: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Full exhibitor type with all properties
 */
export interface Exhibitor extends ExhibitorContact {
  vat: string | null;
  notes: string | null;
}

/**
 * Exhibitor with services data (used in Exhibitors page)
 */
export interface ExhibitorWithServices extends Exhibitor {
  exhibitor_services: ExhibitorServicesData | null;
}

// =============================================================================
// EXHIBITOR SERVICES
// =============================================================================

/**
 * Exhibitor services data structure
 */
export interface ExhibitorServicesData {
  water_connections: number;
  power_option: PowerOption;
  light_points: number;
  construction_booked: boolean;
  carpet_included: boolean;
  surface_type?: SurfaceType;
}

/**
 * Full exhibitor services with exhibitor_id (used in FloorplanEditor)
 * Uses string for power_option and surface_type for flexibility with API responses
 */
export interface ExhibitorServices {
  exhibitor_id: string;
  water_connections: number;
  power_option: string;
  light_points: number;
  construction_booked: boolean;
  carpet_included: boolean;
  surface_type: string;
}

// =============================================================================
// EVENT (using AppEvent to avoid conflict with DOM Event)
// =============================================================================

/**
 * Minimal event info for selectors and references
 */
export interface AppEventMinimal {
  id: string;
  name: string;
}

/**
 * Event with dates and location
 */
export interface AppEventBasic extends AppEventMinimal {
  start_date: string | null;
  end_date: string | null;
  location: string | null;
}

/**
 * Full event type with all properties
 */
export interface AppEvent extends AppEventBasic {
  created_at?: string;
}

// Backward compatible aliases
export type EventMinimal = AppEventMinimal;
export type EventBasic = AppEventBasic;

// =============================================================================
// STAND REQUEST
// =============================================================================

export type StandRequestStatus = 'NEW' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

/**
 * Stand request submitted by exhibitors
 */
export interface StandRequest {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  vat: string | null;
  requested_stand_label: string | null;
  requested_area: number | null;
  requested_width: number | null;
  requested_height: number | null;
  water_connections: number;
  power_option: string;
  light_points: number;
  construction_booked: boolean;
  carpet_included: boolean;
  surface_type: string;
  notes: string | null;
  status: StandRequestStatus;
  created_at: string;
}

// =============================================================================
// EXHIBITOR LIBRARY
// =============================================================================

/**
 * Exhibitor library entry for reusable exhibitor profiles
 */
export interface ExhibitorLibraryEntry {
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

// =============================================================================
// PORTAL TOKEN
// =============================================================================

/**
 * Portal token for exhibitor access
 */
export interface PortalToken {
  id: string;
  event_id: string;
  exhibitor_id: string | null;
  email: string | null;
  enabled: boolean;
}

// =============================================================================
// DASHBOARD STATS
// =============================================================================

/**
 * Stand statistics for dashboard
 */
export interface StandStats {
  available: number;
  reserved: number;
  sold: number;
  blocked: number;
}
