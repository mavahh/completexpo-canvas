import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Ruler } from 'lucide-react';

export interface MeasurementLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface MeasurementToolProps {
  active: boolean;
  onToggle: () => void;
  scaleRatio: number; // 1 unit = scaleRatio meters
  measurementLine: MeasurementLine | null;
}

export function MeasurementToolButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7"
          onClick={onToggle}
        >
          <Ruler className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Meetlint (M)</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function MeasurementOverlay({
  line,
  scaleRatio,
  zoom,
  pan,
}: {
  line: MeasurementLine;
  scaleRatio: number;
  zoom: number;
  pan: { x: number; y: number };
}) {
  const dx = line.endX - line.startX;
  const dy = line.endY - line.startY;
  const distancePx = Math.sqrt(dx * dx + dy * dy);
  const distanceM = (distancePx * scaleRatio).toFixed(2);

  const midX = (line.startX + line.endX) / 2;
  const midY = (line.startY + line.endY) / 2;

  return (
    <g>
      <line
        x1={line.startX}
        y1={line.startY}
        x2={line.endX}
        y2={line.endY}
        stroke="hsl(var(--primary))"
        strokeWidth={2 / zoom}
        strokeDasharray={`${4 / zoom} ${4 / zoom}`}
      />
      {/* Start dot */}
      <circle cx={line.startX} cy={line.startY} r={4 / zoom} fill="hsl(var(--primary))" />
      {/* End dot */}
      <circle cx={line.endX} cy={line.endY} r={4 / zoom} fill="hsl(var(--primary))" />
      {/* Distance label */}
      <rect
        x={midX - 30 / zoom}
        y={midY - 10 / zoom}
        width={60 / zoom}
        height={20 / zoom}
        rx={4 / zoom}
        fill="hsl(var(--card))"
        stroke="hsl(var(--border))"
        strokeWidth={1 / zoom}
      />
      <text
        x={midX}
        y={midY + 4 / zoom}
        textAnchor="middle"
        fontSize={11 / zoom}
        fill="hsl(var(--foreground))"
        fontWeight="600"
      >
        {distanceM}m
      </text>
    </g>
  );
}

export function useMeasurementTool(scaleRatio: number) {
  const [active, setActive] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [line, setLine] = useState<MeasurementLine | null>(null);

  const toggle = useCallback(() => {
    setActive(prev => !prev);
    setMeasuring(false);
    setLine(null);
  }, []);

  const startMeasure = useCallback((x: number, y: number) => {
    if (!active) return false;
    setMeasuring(true);
    setLine({ startX: x, startY: y, endX: x, endY: y });
    return true;
  }, [active]);

  const updateMeasure = useCallback((x: number, y: number) => {
    if (!measuring || !line) return;
    setLine(prev => prev ? { ...prev, endX: x, endY: y } : null);
  }, [measuring, line]);

  const endMeasure = useCallback(() => {
    setMeasuring(false);
    // Keep line visible until toggled off or new measurement starts
  }, []);

  return { active, toggle, measuring, line, startMeasure, updateMeasure, endMeasure };
}
