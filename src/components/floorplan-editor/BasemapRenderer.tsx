/**
 * BasemapRenderer – fetches SVG text and injects it inline into the DOM.
 * The SVG is rendered at its natural size (no stretching).
 * Parent is responsible for scaling/positioning via CSS transforms.
 */

import { useEffect, useRef, useState } from 'react';
import type { BasemapLayer } from '@/types/floorplan-editor';

interface BasemapRendererProps {
  svgUrl: string;
  layers: BasemapLayer[];
  opacity?: number;
  /** Scale factor: 1 SVG unit × scale = 1 world unit (meter) */
  scale?: number;
}

export function BasemapRenderer({ svgUrl, layers, opacity = 100, scale = 1 }: BasemapRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  // Fetch SVG text
  useEffect(() => {
    if (!svgUrl) return;
    let cancelled = false;

    fetch(svgUrl)
      .then(res => res.text())
      .then(text => {
        if (!cancelled) setSvgContent(text);
      })
      .catch(() => {
        if (!cancelled) setSvgContent(null);
      });

    return () => { cancelled = true; };
  }, [svgUrl]);

  // Inject SVG into DOM and apply layer visibility
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;

    const container = containerRef.current;
    container.innerHTML = svgContent;

    const svg = container.querySelector('svg');
    if (svg) {
      // Keep SVG at its natural/viewBox size – don't stretch
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.overflow = 'visible';
      svg.style.display = 'block';

      // Apply layer visibility
      layers.forEach(layer => {
        const groups = svg.querySelectorAll(`[data-layer="${layer.id}"], [id="${layer.id}"]`);
        groups.forEach(g => {
          (g as HTMLElement).style.display = layer.visible ? '' : 'none';
        });
      });
    }
  }, [svgContent, layers]);

  if (!svgUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
        Geen basemap beschikbaar
      </div>
    );
  }

  if (!svgContent) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transformOrigin: '0 0',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        pointerEvents: 'none',
        opacity: opacity / 100,
      }}
    />
  );
}
