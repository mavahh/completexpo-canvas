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
// Editor Layer – 3-layer system (Plattegrond, Technisch plan, Standenplan)
// ---------------------------------------------------------------------------

/** Kind of editor layer */
export type EditorLayerKind = 'plattegrond' | 'technisch' | 'standenplan';

/** A single editor layer with visibility, opacity, and lock state */
export interface EditorLayer {
  id: string;
  name: string;
  kind: EditorLayerKind;
  visible: boolean;
  opacity: number; // 0-100
  locked: boolean; // only meaningful for standenplan
}

// ---------------------------------------------------------------------------
// Basemap layers (sub-layers within SVG files, e.g. walls/lights/text)
// ---------------------------------------------------------------------------

export interface BasemapLayer {
  id: string;
  name: string;
  visible: boolean;
  kind: 'walls' | 'lights' | 'text' | 'other';
}

// ---------------------------------------------------------------------------
// Hall Basemap – now with plattegrond + technisch SVG URLs
// ---------------------------------------------------------------------------

export interface HallBasemap {
  hallId: string;
  units: WorldUnit;
  bbox: BBox;
  layers: BasemapLayer[];
  /** @deprecated use plattegrondSvgUrl instead */
  svgUrl: string;
  /** Plattegrond (floor plan) SVG – read-only base layer */
  plattegrondSvgUrl: string;
  /** Technisch plan SVG – read-only technical layer */
  technischSvgUrl: string;
  svgInline?: string;
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
