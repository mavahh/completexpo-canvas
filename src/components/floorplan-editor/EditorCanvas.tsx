/**
 * EditorCanvas – main SVG canvas with 3-layer system:
 *   1. Plattegrond (read-only SVG)
 *   2. Technisch plan (read-only SVG)
 *   3. Standenplan (editable objects)
 * All share the same camera transform.
 */

import { useRef, useCallback, useState } from 'react';
import { BasemapRenderer } from './BasemapRenderer';
import { screenToWorld } from '@/lib/camera';
import type { Camera, BBox, LayoutObject, LayoutStand, WorldPoint, EditorLayer } from '@/types/floorplan-editor';
import type { EditorToolType } from './EditorTopbar';

interface EditorCanvasProps {
  camera: Camera;
  basemap: { bbox: BBox; plattegrondSvgUrl: string; technischSvgUrl: string; units: string; svgScale?: number } | null;
  editorLayers: EditorLayer[];
  objects: LayoutObject[];
  selectedIds: Set<string>;
  activeTool: EditorToolType;
  showGrid: boolean;
  snapEnabled: boolean;
  gridSize: number;
  spacePressed: boolean;
  standenplanLocked: boolean;
  /** When true, apply CSS transition on the world transform for animated camera moves */
  animating?: boolean;
  /** Active hall zone name for watermark display */
  activeHallZone?: string | null;
  onSelect: (ids: Set<string>) => void;
  onCreateRectStand: (x: number, y: number, w: number, h: number) => void;
  onUpdateObject: (id: string, updates: Partial<LayoutObject>) => void;
  onUpdateObjectSilent: (id: string, updates: Partial<LayoutObject>) => void;
  onCursorMove: (world: WorldPoint | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'hsl(142, 71%, 45%)',
  RESERVED: 'hsl(38, 92%, 50%)',
  SOLD: 'hsl(217, 91%, 60%)',
  BLOCKED: 'hsl(0, 84%, 60%)',
};

function getStandBounds(stand: LayoutStand) {
  const xs = stand.polygon.map(p => p.x);
  const ys = stand.polygon.map(p => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

export function EditorCanvas({
  camera, basemap, editorLayers, objects, selectedIds, activeTool,
  showGrid, snapEnabled, gridSize, spacePressed, standenplanLocked,
  animating = false, activeHallZone = null,
  onSelect, onCreateRectStand, onUpdateObject, onUpdateObjectSilent, onCursorMove,
  containerRef, pointerHandlers,
}: EditorCanvasProps) {
  const [drawRect, setDrawRect] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startWorld: WorldPoint; origPolygon: WorldPoint[] } | null>(null);

  const snap = useCallback((v: number) => {
    if (!snapEnabled) return v;
    return Math.round(v / gridSize) * gridSize;
  }, [snapEnabled, gridSize]);

  const getWorld = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, camera);
  }, [camera, containerRef]);

  // Get layer state helpers
  const getLayer = (kind: string) => editorLayers.find(l => l.kind === kind);
  const plattegrondLayer = getLayer('plattegrond');
  const technischLayer = getLayer('technisch');
  const standenplanLayer = getLayer('standenplan');

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (spacePressed || e.button === 1) {
      pointerHandlers.onPointerDown(e);
      return;
    }

    const world = getWorld(e);

    if (activeTool === 'draw-rect' && !standenplanLocked) {
      e.preventDefault();
      const sx = snap(world.x);
      const sy = snap(world.y);
      setDrawRect({ sx, sy, ex: sx, ey: sy });
      return;
    }

    if (activeTool === 'select') {
      if (!standenplanLocked) {
        const clicked = findObjectAt(world, objects);
        if (clicked) {
          e.stopPropagation();
          if (e.shiftKey) {
            const next = new Set(selectedIds);
            next.has(clicked.id) ? next.delete(clicked.id) : next.add(clicked.id);
            onSelect(next);
          } else {
            onSelect(new Set([clicked.id]));
            if (clicked.type === 'stand') {
              setDragging({
                id: clicked.id,
                startWorld: world,
                origPolygon: [...clicked.polygon],
              });
            }
          }
          return;
        }
      }
      if (!e.shiftKey) onSelect(new Set());
      pointerHandlers.onPointerDown(e);
    }
  }, [activeTool, spacePressed, objects, selectedIds, snap, getWorld, onSelect, pointerHandlers, standenplanLocked]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const world = getWorld(e);
    onCursorMove(world);

    if (drawRect) {
      setDrawRect(prev => prev ? { ...prev, ex: snap(world.x), ey: snap(world.y) } : null);
      return;
    }

    if (dragging) {
      const dx = snap(world.x - dragging.startWorld.x);
      const dy = snap(world.y - dragging.startWorld.y);
      const newPolygon = dragging.origPolygon.map(p => ({ x: p.x + dx, y: p.y + dy }));
      onUpdateObjectSilent(dragging.id, { polygon: newPolygon } as Partial<LayoutStand>);
      return;
    }

    pointerHandlers.onPointerMove(e);
  }, [drawRect, dragging, snap, getWorld, onCursorMove, onUpdateObjectSilent, pointerHandlers]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (drawRect) {
      const x = Math.min(drawRect.sx, drawRect.ex);
      const y = Math.min(drawRect.sy, drawRect.ey);
      const w = Math.abs(drawRect.ex - drawRect.sx);
      const h = Math.abs(drawRect.ey - drawRect.sy);
      if (w >= gridSize && h >= gridSize) {
        onCreateRectStand(x, y, w, h);
      }
      setDrawRect(null);
      return;
    }

    if (dragging) {
      const obj = objects.find(o => o.id === dragging.id) as LayoutStand | undefined;
      if (obj) {
        onUpdateObject(dragging.id, { polygon: obj.polygon } as Partial<LayoutStand>);
      }
      setDragging(null);
      return;
    }

    pointerHandlers.onPointerUp(e);
  }, [drawRect, dragging, gridSize, objects, onCreateRectStand, onUpdateObject, pointerHandlers]);

  const bboxW = basemap ? basemap.bbox.maxX - basemap.bbox.minX : 1000;
  const bboxH = basemap ? basemap.bbox.maxY - basemap.bbox.minY : 600;

  const cursorStyle = standenplanLocked ? 'not-allowed'
    : activeTool === 'draw-rect' ? 'crosshair'
    : activeTool === 'measure' ? 'crosshair'
    : spacePressed ? 'grab'
    : dragging ? 'grabbing'
    : 'default';

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ cursor: cursorStyle, background: 'hsl(var(--editor-canvas, 220 14% 10%))' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Single transformed world container – all layers share this */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          willChange: 'transform',
        }}
      >
        {/* Grid */}
        {showGrid && (
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={bboxW}
            height={bboxH}
            style={{ opacity: 0.15 }}
          >
            <defs>
              <pattern id="editor-grid" x="0" y="0" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="currentColor" strokeWidth={0.5} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#editor-grid)" />
          </svg>
        )}

        {/* Layer 1: Plattegrond (read-only SVG) – scaled so SVG units map to world meters */}
        {basemap && plattegrondLayer?.visible && basemap.plattegrondSvgUrl && (
          <BasemapRenderer
            svgUrl={basemap.plattegrondSvgUrl}
            layers={[]}
            opacity={plattegrondLayer.opacity ?? 100}
            scale={basemap.svgScale ?? 1}
          />
        )}

        {/* Layer 2: Technisch plan (read-only SVG) */}
        {basemap && technischLayer?.visible && basemap.technischSvgUrl && (
          <BasemapRenderer
            svgUrl={basemap.technischSvgUrl}
            layers={[]}
            opacity={technischLayer.opacity ?? 100}
            scale={basemap.svgScale ?? 1}
          />
        )}

        {/* Layer 3: Standenplan (editable objects) */}
        {standenplanLayer?.visible && (
          <svg
            className="absolute top-0 left-0"
            width={bboxW}
            height={bboxH}
            style={{ pointerEvents: 'none', opacity: (standenplanLayer.opacity ?? 100) / 100 }}
          >
            {objects.map(obj => {
              if (obj.type !== 'stand') return null;
              const bounds = getStandBounds(obj);
              const isSelected = selectedIds.has(obj.id);
              const color = obj.color || STATUS_COLORS[obj.status || 'AVAILABLE'] || STATUS_COLORS.AVAILABLE;

              return (
                <g key={obj.id} style={{ pointerEvents: standenplanLocked ? 'none' : 'all' }}>
                  <rect
                    x={bounds.x}
                    y={bounds.y}
                    width={bounds.w}
                    height={bounds.h}
                    fill={color}
                    fillOpacity={0.6}
                    stroke={isSelected ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.4)'}
                    strokeWidth={isSelected ? 2 / camera.zoom : 1 / camera.zoom}
                    rx={1 / camera.zoom}
                    className={standenplanLocked ? '' : 'cursor-move'}
                  />
                  {obj.label && bounds.w > 5 && (
                    <text
                      x={bounds.x + bounds.w / 2}
                      y={bounds.y + bounds.h / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={Math.min(bounds.w / 4, bounds.h / 3, 14 / camera.zoom)}
                      fontWeight="600"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {obj.label}
                    </text>
                  )}
                  {isSelected && !standenplanLocked && (
                    <>
                      <rect
                        x={bounds.x - 3 / camera.zoom}
                        y={bounds.y - 3 / camera.zoom}
                        width={bounds.w + 6 / camera.zoom}
                        height={bounds.h + 6 / camera.zoom}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5 / camera.zoom}
                        strokeDasharray={`${4 / camera.zoom}`}
                        style={{ pointerEvents: 'none' }}
                      />
                      {[
                        { cx: bounds.x, cy: bounds.y },
                        { cx: bounds.x + bounds.w, cy: bounds.y },
                        { cx: bounds.x + bounds.w, cy: bounds.y + bounds.h },
                        { cx: bounds.x, cy: bounds.y + bounds.h },
                      ].map((h, i) => (
                        <rect
                          key={i}
                          x={h.cx - 3 / camera.zoom}
                          y={h.cy - 3 / camera.zoom}
                          width={6 / camera.zoom}
                          height={6 / camera.zoom}
                          fill="hsl(var(--primary))"
                          stroke="white"
                          strokeWidth={1 / camera.zoom}
                          className="cursor-nwse-resize"
                          style={{ pointerEvents: 'all' }}
                        />
                      ))}
                    </>
                  )}
                </g>
              );
            })}

            {drawRect && (
              <rect
                x={Math.min(drawRect.sx, drawRect.ex)}
                y={Math.min(drawRect.sy, drawRect.ey)}
                width={Math.abs(drawRect.ex - drawRect.sx)}
                height={Math.abs(drawRect.ey - drawRect.sy)}
                fill="hsl(var(--primary) / 0.2)"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5 / camera.zoom}
                strokeDasharray={`${4 / camera.zoom}`}
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

function findObjectAt(world: WorldPoint, objects: LayoutObject[]): LayoutObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj.type === 'stand') {
      const b = getStandBounds(obj);
      if (world.x >= b.x && world.x <= b.x + b.w && world.y >= b.y && world.y <= b.y + b.h) {
        return obj;
      }
    }
  }
  return null;
}
