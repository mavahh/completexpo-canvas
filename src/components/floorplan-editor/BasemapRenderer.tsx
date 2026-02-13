/**
 * BasemapRenderer – renders an SVG basemap with layer visibility support.
 * Wraps SVG in a group that can be toggled per layer.
 */

import { useEffect, useRef, useState } from 'react';
import type { BasemapLayer } from '@/types/floorplan-editor';

interface BasemapRendererProps {
  svgUrl: string;
  layers: BasemapLayer[];
  opacity?: number;
}

export function BasemapRenderer({ svgUrl, layers, opacity = 100 }: BasemapRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Fetch and parse SVG
  useEffect(() => {
    if (!svgUrl) return;

    const fetchSvg = async () => {
      try {
        const res = await fetch(svgUrl);
        const text = await res.text();
        setSvgContent(text);

        // Parse viewBox or dimensions
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (svg) {
          const viewBox = svg.getAttribute('viewBox');
          if (viewBox) {
            const parts = viewBox.trim().split(/[\s,]+/).map(Number);
            if (parts.length === 4) {
              setNaturalSize({ width: parts[2], height: parts[3] });
            }
          } else {
            const w = parseFloat(svg.getAttribute('width') || '0');
            const h = parseFloat(svg.getAttribute('height') || '0');
            if (w > 0 && h > 0) setNaturalSize({ width: w, height: h });
          }
        }
      } catch {
        // If SVG fetch fails, try as image
        setSvgContent(null);
      }
    };

    fetchSvg();
  }, [svgUrl]);

  // Apply layer visibility to inline SVG
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;

    const container = containerRef.current;
    container.innerHTML = svgContent;

    const svg = container.querySelector('svg');
    if (svg) {
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.overflow = 'visible';

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

  // If we have inline SVG content, render it
  if (svgContent) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: opacity / 100 }}
      />
    );
  }

  // Fallback: render as <img>
  return (
    <img
      src={svgUrl}
      alt="Basemap"
      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      style={{ opacity: opacity / 100 }}
    />
  );
}
