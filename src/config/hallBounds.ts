import type { BBox } from '@/types/floorplan-editor';

/**
 * Hall bounding boxes in world meters, derived from the
 * Flanders Expo SVG at scale 1.4073.
 */
export const HALL_BOUNDS: Record<string, BBox> = {
  'HAL 2':  { minX: 680, minY:  60, maxX: 780, maxY: 175 },
  'HAL 1':  { minX: 780, minY:  60, maxX: 900, maxY: 175 },
  'HAL 4':  { minX: 680, minY: 175, maxX: 780, maxY: 290 },
  'HAL 3':  { minX: 710, minY: 245, maxX: 785, maxY: 375 },
  'HAL 5':  { minX: 785, minY: 245, maxX: 860, maxY: 375 },
  'HAL 7':  { minX: 860, minY: 245, maxX: 935, maxY: 375 },
  'HAL 8':  { minX: 740, minY: 370, maxX: 860, maxY: 440 },
  'FOYER':  { minX: 680, minY: 155, maxX: 780, maxY: 200 },
};

export const HALL_NAMES = Object.keys(HALL_BOUNDS);
