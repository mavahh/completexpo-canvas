import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Bug } from 'lucide-react';
import type { SvgBounds } from '@/lib/svgBounds';

interface BackgroundDebugPanelProps {
  backgroundUrl: string | null | undefined;
  svgViewBox: string | null;
  computedBounds: SvgBounds | null;
  viewportSize: { width: number; height: number };
  cameraPan: { x: number; y: number };
  cameraZoom: number;
  onFitBackground: () => void;
  onSetEmergencyZoom: () => void;
  onCenter: () => void;
  onLogSvg: () => void;
}

export function BackgroundDebugPanel({
  backgroundUrl,
  svgViewBox,
  computedBounds,
  viewportSize,
  cameraPan,
  cameraZoom,
  onFitBackground,
  onSetEmergencyZoom,
  onCenter,
  onLogSvg,
}: BackgroundDebugPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="absolute bottom-3 left-3 z-30 bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg text-xs max-w-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 px-3 py-2 w-full text-left hover:bg-muted/50 rounded-lg transition-colors"
      >
        <Bug className="w-3.5 h-3.5 text-orange-500" />
        <span className="font-medium text-foreground">Debug Panel</span>
        {collapsed ? <ChevronRight className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          {/* Background URL */}
          <div>
            <span className="text-muted-foreground">BG URL:</span>
            <div className="text-foreground truncate max-w-[280px]">{backgroundUrl || '(none)'}</div>
          </div>

          {/* SVG viewBox */}
          <div>
            <span className="text-muted-foreground">viewBox:</span>
            <span className="ml-1 text-foreground font-mono">{svgViewBox || '(none)'}</span>
          </div>

          {/* Computed bounds */}
          <div>
            <span className="text-muted-foreground">Bounds:</span>
            {computedBounds ? (
              <div className="font-mono text-foreground">
                [{computedBounds.minX.toFixed(1)}, {computedBounds.minY.toFixed(1)}] →
                [{computedBounds.maxX.toFixed(1)}, {computedBounds.maxY.toFixed(1)}]
                <br />
                {computedBounds.width.toFixed(1)} × {computedBounds.height.toFixed(1)} (via {computedBounds.source})
              </div>
            ) : (
              <span className="ml-1 text-destructive font-mono">(invalid)</span>
            )}
          </div>

          {/* Viewport */}
          <div>
            <span className="text-muted-foreground">Viewport:</span>
            <span className="ml-1 text-foreground font-mono">{viewportSize.width} × {viewportSize.height}</span>
          </div>

          {/* Camera */}
          <div>
            <span className="text-muted-foreground">Camera:</span>
            <span className="ml-1 text-foreground font-mono">
              pan({cameraPan.x.toFixed(1)}, {cameraPan.y.toFixed(1)}) zoom({cameraZoom.toFixed(4)})
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-1 pt-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onFitBackground}>
              Fit background
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onSetEmergencyZoom}>
              Zoom 0.001
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onCenter}>
              Center
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onLogSvg}>
              Log SVG
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
