import { describe, it, expect } from 'vitest';
import { worldToScreen, screenToWorld, fitToBounds, zoomAtPoint } from '../camera';

describe('worldToScreen / screenToWorld', () => {
  const cam = { x: 100, y: 50, zoom: 2 };

  it('converts world to screen', () => {
    const s = worldToScreen({ x: 10, y: 20 }, cam);
    expect(s.x).toBe(10 * 2 + 100); // 120
    expect(s.y).toBe(20 * 2 + 50);  // 90
  });

  it('round-trips correctly', () => {
    const world = { x: 42, y: 99 };
    const screen = worldToScreen(world, cam);
    const back = screenToWorld(screen, cam);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });
});

describe('fitToBounds', () => {
  it('fits a 100x100 bbox into a 800x600 viewport', () => {
    const cam = fitToBounds(
      { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      { width: 800, height: 600 },
      0.9,
    );
    // limiting factor is height: 600/100 * 0.9 = 5.4
    expect(cam.zoom).toBeCloseTo(5.4);
    // center of bbox (50,50) should map to center of viewport (400,300)
    expect(cam.x + 50 * cam.zoom).toBeCloseTo(400);
    expect(cam.y + 50 * cam.zoom).toBeCloseTo(300);
  });

  it('returns identity for degenerate input', () => {
    const cam = fitToBounds({ minX: 0, minY: 0, maxX: 0, maxY: 0 }, { width: 800, height: 600 });
    expect(cam.zoom).toBe(1);
  });
});

describe('zoomAtPoint', () => {
  it('keeps world point under cursor fixed after zoom in', () => {
    const cam = { x: 0, y: 0, zoom: 1 };
    const cursor = { x: 200, y: 150 };
    const zoomed = zoomAtPoint(cam, cursor, 1);

    // world point under cursor before
    const wxBefore = (cursor.x - cam.x) / cam.zoom;
    const wyBefore = (cursor.y - cam.y) / cam.zoom;

    // world point under cursor after
    const wxAfter = (cursor.x - zoomed.x) / zoomed.zoom;
    const wyAfter = (cursor.y - zoomed.y) / zoomed.zoom;

    expect(wxAfter).toBeCloseTo(wxBefore);
    expect(wyAfter).toBeCloseTo(wyBefore);
  });
});
