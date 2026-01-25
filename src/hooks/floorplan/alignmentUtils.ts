import type { Stand } from '@/types';

export type AlignmentType = 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV';
export type DistributionType = 'horizontal' | 'vertical';

/**
 * Align multiple stands to a given alignment type
 */
export function alignStands(stands: Stand[], alignment: AlignmentType): Partial<Stand>[] {
  if (stands.length < 2) return [];

  const updates: Partial<Stand>[] = [];

  switch (alignment) {
    case 'left': {
      const minX = Math.min(...stands.map(s => s.x));
      stands.forEach(s => {
        if (s.x !== minX) {
          updates.push({ id: s.id, x: minX } as Partial<Stand> & { id: string });
        }
      });
      break;
    }
    case 'right': {
      const maxRight = Math.max(...stands.map(s => s.x + s.width));
      stands.forEach(s => {
        const newX = maxRight - s.width;
        if (s.x !== newX) {
          updates.push({ id: s.id, x: newX } as Partial<Stand> & { id: string });
        }
      });
      break;
    }
    case 'top': {
      const minY = Math.min(...stands.map(s => s.y));
      stands.forEach(s => {
        if (s.y !== minY) {
          updates.push({ id: s.id, y: minY } as Partial<Stand> & { id: string });
        }
      });
      break;
    }
    case 'bottom': {
      const maxBottom = Math.max(...stands.map(s => s.y + s.height));
      stands.forEach(s => {
        const newY = maxBottom - s.height;
        if (s.y !== newY) {
          updates.push({ id: s.id, y: newY } as Partial<Stand> & { id: string });
        }
      });
      break;
    }
    case 'centerH': {
      const centerX = stands.reduce((sum, s) => sum + s.x + s.width / 2, 0) / stands.length;
      stands.forEach(s => {
        const newX = centerX - s.width / 2;
        if (Math.abs(s.x - newX) > 0.5) {
          updates.push({ id: s.id, x: Math.round(newX) } as Partial<Stand> & { id: string });
        }
      });
      break;
    }
    case 'centerV': {
      const centerY = stands.reduce((sum, s) => sum + s.y + s.height / 2, 0) / stands.length;
      stands.forEach(s => {
        const newY = centerY - s.height / 2;
        if (Math.abs(s.y - newY) > 0.5) {
          updates.push({ id: s.id, y: Math.round(newY) } as Partial<Stand> & { id: string });
        }
      });
      break;
    }
  }

  return updates;
}

/**
 * Distribute stands evenly
 */
export function distributeStands(stands: Stand[], direction: DistributionType): Partial<Stand>[] {
  if (stands.length < 3) return [];

  const updates: Partial<Stand>[] = [];
  const sorted = [...stands];

  if (direction === 'horizontal') {
    sorted.sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalWidth = (last.x + last.width) - first.x;
    const standsWidth = sorted.reduce((sum, s) => sum + s.width, 0);
    const gap = (totalWidth - standsWidth) / (sorted.length - 1);

    let currentX = first.x;
    sorted.forEach((s, i) => {
      if (i === 0) {
        currentX += s.width + gap;
        return;
      }
      if (i === sorted.length - 1) return;

      if (Math.abs(s.x - currentX) > 0.5) {
        updates.push({ id: s.id, x: Math.round(currentX) } as Partial<Stand> & { id: string });
      }
      currentX += s.width + gap;
    });
  } else {
    sorted.sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalHeight = (last.y + last.height) - first.y;
    const standsHeight = sorted.reduce((sum, s) => sum + s.height, 0);
    const gap = (totalHeight - standsHeight) / (sorted.length - 1);

    let currentY = first.y;
    sorted.forEach((s, i) => {
      if (i === 0) {
        currentY += s.height + gap;
        return;
      }
      if (i === sorted.length - 1) return;

      if (Math.abs(s.y - currentY) > 0.5) {
        updates.push({ id: s.id, y: Math.round(currentY) } as Partial<Stand> & { id: string });
      }
      currentY += s.height + gap;
    });
  }

  return updates;
}

/**
 * Snap stands to grid
 */
export function snapStandsToGrid(stands: Stand[], gridSize: number): Partial<Stand>[] {
  return stands.map(s => ({
    id: s.id,
    x: Math.round(s.x / gridSize) * gridSize,
    y: Math.round(s.y / gridSize) * gridSize,
    width: Math.max(gridSize, Math.round(s.width / gridSize) * gridSize),
    height: Math.max(gridSize, Math.round(s.height / gridSize) * gridSize),
  } as Partial<Stand> & { id: string }));
}

/**
 * Calculate nudge offset based on key and modifiers
 */
export function calculateNudgeOffset(
  key: string, 
  gridSize: number, 
  shiftKey: boolean, 
  ctrlKey: boolean
): { dx: number; dy: number } {
  let step = gridSize;
  
  if (shiftKey) {
    step = gridSize * 5; // 5x for shift
  } else if (ctrlKey) {
    step = 1; // 1px for fine mode
  }

  switch (key) {
    case 'ArrowUp':
      return { dx: 0, dy: -step };
    case 'ArrowDown':
      return { dx: 0, dy: step };
    case 'ArrowLeft':
      return { dx: -step, dy: 0 };
    case 'ArrowRight':
      return { dx: step, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}
