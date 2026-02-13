// =============================================================================
// FLOORPLAN EDITOR – World-coordinate types & data contracts
// =============================================================================

/** Coordinate point in world units (meters or mm) */
export interface WorldPoint {
  x: number;
  y: number;
}

/** Axis-aligned bounding box */
export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Unit system */
export type WorldUnit = 'mm' | 'm';

// ---------------------------------------------------------------------------
// Hall Basemap
// ---------------------------------------------------------------------------

export interface BasemapLayer {
  id: string;
  name: string;
  visible: boolean;
  kind: 'walls' | 'lights' | 'text' | 'other';
}

export interface HallBasemap {
  hallId: string;
  units: WorldUnit;
  bbox: BBox;
  layers: BasemapLayer[];
  svgUrl: string;        // URL to basemap SVG stored in storage
  svgInline?: string;     // optional inline SVG string (for dev/mock)
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Event Layout – objects placed on a hall basemap
// ---------------------------------------------------------------------------

export type LayoutObjectType = 'stand' | 'point' | 'polygon';

export interface LayoutStand {
  id: string;
  type: 'stand';
  polygon: WorldPoint[];   // world-coordinate vertices (usually 4 for a rect)
  label?: string;
  exhibitorId?: string;
  color?: string;
  status?: string;
}

export interface LayoutPoint {
  id: string;
  type: 'point';
  position: WorldPoint;
  label?: string;
  kind?: string;           // e.g. "power", "water", "emergency_exit"
}

export interface LayoutPolygon {
  id: string;
  type: 'polygon';
  polygon: WorldPoint[];
  label?: string;
  kind?: string;           // e.g. "zone", "restricted"
}

export type LayoutObject = LayoutStand | LayoutPoint | LayoutPolygon;

export interface EventLayout {
  eventId: string;
  hallId: string;
  objects: LayoutObject[];
  version: number;
}

// ---------------------------------------------------------------------------
// Camera – single source of truth for world → screen mapping
// ---------------------------------------------------------------------------

export interface Camera {
  x: number;   // pan x in screen pixels
  y: number;   // pan y in screen pixels
  zoom: number; // scale factor  (1 = 1:1)
}

// ---------------------------------------------------------------------------
// API request / response shapes (edge function contracts)
// ---------------------------------------------------------------------------

export interface ImportResult {
  success: boolean;
  basemap?: HallBasemap;
  error?: string;
}
