import type { SvgBounds } from './svgBounds';

export interface CameraState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Compute camera state to fit given bounds into viewport with padding.
 */
export function fitCameraToBounds(
  bounds: SvgBounds,
  viewport: ViewportSize,
  padding = 0.9 // 90% of viewport = 10% padding
): CameraState {
  if (bounds.width <= 0 || bounds.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { zoom: 1, panX: 0, panY: 0 };
  }

  const zoom = Math.min(
    viewport.width / bounds.width,
    viewport.height / bounds.height
  ) * padding;

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const panX = viewport.width / 2 - centerX * zoom;
  const panY = viewport.height / 2 - centerY * zoom;

  return { zoom, panX, panY };
}

/**
 * Compute camera state to center on bounds without changing zoom.
 */
export function centerCameraOnBounds(
  bounds: SvgBounds,
  viewport: ViewportSize,
  currentZoom: number
): CameraState {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const panX = viewport.width / 2 - centerX * currentZoom;
  const panY = viewport.height / 2 - centerY * currentZoom;

  return { zoom: currentZoom, panX, panY };
}
