/**
 * Camera transform utilities for world ↔ screen coordinate mapping.
 *
 * Convention:
 *   screenX = worldX * zoom + camera.x
 *   screenY = worldY * zoom + camera.y
 */

import type { Camera, BBox, WorldPoint } from '@/types/floorplan-editor';

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

export function worldToScreen(world: WorldPoint, cam: Camera): { x: number; y: number } {
  return {
    x: world.x * cam.zoom + cam.x,
    y: world.y * cam.zoom + cam.y,
  };
}

export function screenToWorld(screen: { x: number; y: number }, cam: Camera): WorldPoint {
  return {
    x: (screen.x - cam.x) / cam.zoom,
    y: (screen.y - cam.y) / cam.zoom,
  };
}

// ---------------------------------------------------------------------------
// Fit-to-bounds: compute camera so bbox fills viewport with padding
// ---------------------------------------------------------------------------

export interface ViewportSize {
  width: number;
  height: number;
}

export function fitToBounds(
  bbox: BBox,
  viewport: ViewportSize,
  padding = 0.9, // use 90 % of viewport
): Camera {
  const bw = bbox.maxX - bbox.minX;
  const bh = bbox.maxY - bbox.minY;

  if (bw <= 0 || bh <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  const zoom = Math.min(viewport.width / bw, viewport.height / bh) * padding;
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;

  return {
    zoom,
    x: viewport.width / 2 - cx * zoom,
    y: viewport.height / 2 - cy * zoom,
  };
}

// ---------------------------------------------------------------------------
// Zoom-to-cursor: adjust camera so world point under cursor stays fixed
// ---------------------------------------------------------------------------

export function zoomAtPoint(
  cam: Camera,
  cursorScreen: { x: number; y: number },
  delta: number, // positive = zoom in
  minZoom = 0.05,
  maxZoom = 20,
): Camera {
  const factor = delta > 0 ? 1.1 : 1 / 1.1;
  const newZoom = Math.min(maxZoom, Math.max(minZoom, cam.zoom * factor));

  // Keep world point under cursor fixed
  const wx = (cursorScreen.x - cam.x) / cam.zoom;
  const wy = (cursorScreen.y - cam.y) / cam.zoom;

  return {
    zoom: newZoom,
    x: cursorScreen.x - wx * newZoom,
    y: cursorScreen.y - wy * newZoom,
  };
}

// ---------------------------------------------------------------------------
// Clamp zoom
// ---------------------------------------------------------------------------

export function clampZoom(zoom: number, min = 0.05, max = 20): number {
  return Math.min(max, Math.max(min, zoom));
}
