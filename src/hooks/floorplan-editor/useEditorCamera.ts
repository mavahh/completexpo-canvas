/**
 * useEditorCamera – manages camera state (pan/zoom) for the floorplan editor.
 * Provides mouse-wheel zoom-to-cursor, space+drag pan, fit-to-bounds, shortcuts.
 * Supports animated transitions via CSS transition toggling.
 */

import { useState, useCallback, useEffect, useRef, RefObject } from 'react';
import type { Camera, BBox } from '@/types/floorplan-editor';
import { fitToBounds, zoomAtPoint, clampZoom, type ViewportSize } from '@/lib/camera';

interface UseEditorCameraOptions {
  containerRef: RefObject<HTMLDivElement>;
  initialBBox?: BBox | null;
}

const PADDING = 60;

export function useEditorCamera({ containerRef, initialBBox }: UseEditorCameraOptions) {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  /** When true, the world-transform container should apply a CSS transition */
  const [animating, setAnimating] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Viewport helper ----
  const getViewport = useCallback((): ViewportSize => {
    const el = containerRef.current;
    if (!el) return { width: 800, height: 600 };
    return { width: el.clientWidth, height: el.clientHeight };
  }, [containerRef]);

  // ---- Fit to bbox (instant) ----
  const fit = useCallback((bbox: BBox | null | undefined) => {
    if (!bbox) return;
    const vp = getViewport();
    const bw = bbox.maxX - bbox.minX;
    const bh = bbox.maxY - bbox.minY;
    const zoom = clampZoom(Math.min(
      (vp.width - PADDING * 2) / bw,
      (vp.height - PADDING * 2) / bh,
    ));
    setCamera({
      x: -bbox.minX * zoom + (vp.width - bw * zoom) / 2,
      y: -bbox.minY * zoom + (vp.height - bh * zoom) / 2,
      zoom,
    });
  }, [getViewport]);

  // ---- Animated fit to bbox (400ms CSS transition) ----
  const fitAnimated = useCallback((bbox: BBox | null | undefined) => {
    if (!bbox) return;
    // Clear any pending animation timer
    if (animTimerRef.current) clearTimeout(animTimerRef.current);

    setAnimating(true);

    const vp = getViewport();
    const bw = bbox.maxX - bbox.minX;
    const bh = bbox.maxY - bbox.minY;
    const zoom = clampZoom(Math.min(
      (vp.width - PADDING * 2) / bw,
      (vp.height - PADDING * 2) / bh,
    ));
    setCamera({
      x: -bbox.minX * zoom + (vp.width - bw * zoom) / 2,
      y: -bbox.minY * zoom + (vp.height - bh * zoom) / 2,
      zoom,
    });

    // Turn off animating flag after transition completes
    animTimerRef.current = setTimeout(() => setAnimating(false), 420);
  }, [getViewport]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
  }, []);

  // Initial fit
  useEffect(() => {
    if (initialBBox) fit(initialBBox);
  }, [initialBBox]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Zoom ----
  const zoomIn = useCallback(() => {
    setCamera(c => ({ ...c, zoom: clampZoom(c.zoom * 1.2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setCamera(c => ({ ...c, zoom: clampZoom(c.zoom / 1.2) }));
  }, []);

  // ---- Mouse wheel zoom-to-cursor ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Disable animation on manual interaction
      setAnimating(false);
      const rect = el.getBoundingClientRect();
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const delta = e.deltaY < 0 ? 1 : -1;
      setCamera(c => zoomAtPoint(c, cursor, delta));
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef]);

  // ---- Space key for pan mode ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setSpacePressed(true); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ---- Middle-mouse / space+drag pan ----
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || spacePressed) {
      e.preventDefault();
      setAnimating(false); // cancel animation on manual pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    }
  }, [spacePressed, camera.x, camera.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    setCamera(c => ({ ...c, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
  }, [isPanning, panStart]);

  const onPointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;

      if (e.key === '0') { fit(initialBBox); return; }
      if (e.key === '+' || e.key === '=') { zoomIn(); return; }
      if (e.key === '-') { zoomOut(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fit, initialBBox, zoomIn, zoomOut]);

  return {
    camera,
    setCamera,
    spacePressed,
    isPanning,
    animating,
    fit,
    fitAnimated,
    zoomIn,
    zoomOut,
    zoomPercent: Math.round(camera.zoom * 100),
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
