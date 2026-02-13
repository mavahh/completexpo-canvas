import { useState, useEffect, useCallback, useRef } from 'react';
import { getSvgBoundsFromString, SvgBounds } from '@/lib/svgBounds';
import { fitCameraToBounds, centerCameraOnBounds, ViewportSize } from '@/lib/cameraFit';

interface UseBackgroundBoundsProps {
  backgroundUrl: string | null | undefined;
  containerRef: React.RefObject<HTMLDivElement>;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  zoom: number;
}

export function useBackgroundBounds({
  backgroundUrl,
  containerRef,
  setZoom,
  setPan,
  zoom,
}: UseBackgroundBoundsProps) {
  const [bounds, setBounds] = useState<SvgBounds | null>(null);
  const [svgViewBox, setSvgViewBox] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const hasFittedRef = useRef(false);
  const lastUrlRef = useRef<string | null>(null);

  // Fetch and parse SVG bounds
  useEffect(() => {
    if (!backgroundUrl) {
      setBounds(null);
      setSvgViewBox(null);
      setSvgContent(null);
      setError(null);
      hasFittedRef.current = false;
      lastUrlRef.current = null;
      return;
    }

    // Don't re-fetch same URL
    if (backgroundUrl === lastUrlRef.current) return;
    lastUrlRef.current = backgroundUrl;
    hasFittedRef.current = false;

    const isSvg = backgroundUrl.toLowerCase().includes('.svg') || backgroundUrl.includes('image/svg');

    if (!isSvg) {
      // For non-SVG backgrounds, we can't compute bounds from content
      // Use the image dimensions via an Image element
      setLoading(true);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const b: SvgBounds = {
          minX: 0, minY: 0,
          maxX: img.naturalWidth, maxY: img.naturalHeight,
          width: img.naturalWidth, height: img.naturalHeight,
          source: 'dimensions',
        };
        setBounds(b);
        setSvgViewBox(null);
        setLoading(false);
        setError(null);
      };
      img.onerror = () => {
        setError('Failed to load background image');
        setLoading(false);
      };
      img.src = backgroundUrl;
      return;
    }

    // SVG: fetch and parse
    setLoading(true);
    setError(null);

    fetch(backgroundUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => {
        setSvgContent(text);
        
        // Extract viewBox string for debug
        const match = text.match(/viewBox\s*=\s*["']([^"']+)["']/i);
        setSvgViewBox(match ? match[1] : null);

        const computed = getSvgBoundsFromString(text);
        if (computed) {
          setBounds(computed);
          setError(null);
        } else {
          setError('Could not determine SVG bounds');
          setBounds(null);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch SVG');
        setLoading(false);
      });
  }, [backgroundUrl]);

  // Auto-fit on first load
  useEffect(() => {
    if (bounds && !hasFittedRef.current && containerRef.current) {
      hasFittedRef.current = true;
      // Small delay to ensure container is measured
      requestAnimationFrame(() => fitToBackground());
    }
  }, [bounds]);

  const getViewportSize = useCallback((): ViewportSize => {
    if (!containerRef.current) return { width: 800, height: 600 };
    return {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    };
  }, [containerRef]);

  const fitToBackground = useCallback(() => {
    if (!bounds) return;
    const viewport = getViewportSize();
    const camera = fitCameraToBounds(bounds, viewport);
    setZoom(camera.zoom);
    setPan({ x: camera.panX, y: camera.panY });
  }, [bounds, getViewportSize, setZoom, setPan]);

  const resetView = useCallback(() => {
    // Fit to background if available, otherwise reset to defaults
    if (bounds) {
      fitToBackground();
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [bounds, fitToBackground, setZoom, setPan]);

  const centerOnBackground = useCallback(() => {
    if (!bounds) return;
    const viewport = getViewportSize();
    const camera = centerCameraOnBounds(bounds, viewport, zoom);
    setPan({ x: camera.panX, y: camera.panY });
  }, [bounds, getViewportSize, zoom, setPan]);

  const setEmergencyZoom = useCallback(() => {
    setZoom(0.001);
    setPan({ x: 0, y: 0 });
  }, [setZoom, setPan]);

  const logSvgHtml = useCallback(() => {
    if (svgContent) {
      console.log('=== SVG Content ===');
      console.log(svgContent.substring(0, 2000));
      console.log('=== Bounds ===', bounds);
    } else {
      console.log('No SVG content loaded');
    }
  }, [svgContent, bounds]);

  return {
    bounds,
    svgViewBox,
    loading,
    error,
    svgContent,
    fitToBackground,
    resetView,
    centerOnBackground,
    setEmergencyZoom,
    logSvgHtml,
    getViewportSize,
  };
}
