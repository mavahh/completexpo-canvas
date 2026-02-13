export interface SvgBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  source: 'viewBox' | 'dimensions' | 'getBBox' | 'fallback';
}

/**
 * Compute reliable bounds from an SVG element.
 * Priority: viewBox → width/height → getBBox → fallback
 */
export function getSvgBounds(svgElement: SVGSVGElement | null): SvgBounds | null {
  if (!svgElement) return null;

  // 1) Try viewBox
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(n => isFinite(n)) && parts[2] > 0 && parts[3] > 0) {
      const [minX, minY, w, h] = parts;
      return { minX, minY, maxX: minX + w, maxY: minY + h, width: w, height: h, source: 'viewBox' };
    }
  }

  // 2) Try width/height attributes
  const wAttr = svgElement.getAttribute('width');
  const hAttr = svgElement.getAttribute('height');
  if (wAttr && hAttr) {
    const w = parseFloat(wAttr);
    const h = parseFloat(hAttr);
    if (isFinite(w) && isFinite(h) && w > 0 && h > 0) {
      return { minX: 0, minY: 0, maxX: w, maxY: h, width: w, height: h, source: 'dimensions' };
    }
  }

  // 3) Try getBBox (element must be in DOM)
  try {
    const bbox = svgElement.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      return {
        minX: bbox.x,
        minY: bbox.y,
        maxX: bbox.x + bbox.width,
        maxY: bbox.y + bbox.height,
        width: bbox.width,
        height: bbox.height,
        source: 'getBBox',
      };
    }
  } catch {
    // getBBox can throw if element is not rendered
  }

  return null;
}

/**
 * Parse SVG string and extract bounds without rendering.
 * Useful for pre-computing before mount.
 */
export function getSvgBoundsFromString(svgString: string): SvgBounds | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return null;

    // viewBox
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every(n => isFinite(n)) && parts[2] > 0 && parts[3] > 0) {
        const [minX, minY, w, h] = parts;
        return { minX, minY, maxX: minX + w, maxY: minY + h, width: w, height: h, source: 'viewBox' };
      }
    }

    // width/height
    const wAttr = svg.getAttribute('width');
    const hAttr = svg.getAttribute('height');
    if (wAttr && hAttr) {
      const w = parseFloat(wAttr);
      const h = parseFloat(hAttr);
      if (isFinite(w) && isFinite(h) && w > 0 && h > 0) {
        return { minX: 0, minY: 0, maxX: w, maxY: h, width: w, height: h, source: 'dimensions' };
      }
    }
  } catch {
    // Parsing failed
  }
  return null;
}
