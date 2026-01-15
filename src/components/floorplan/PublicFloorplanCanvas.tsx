import { forwardRef, useRef, useCallback } from 'react';
import { STAND_STATUS_CONFIG, StandStatus } from './StandLegend';
import { StandServiceIcons } from './StandServiceIcons';
import type { Stand, Floorplan, ExhibitorServices } from '@/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PublicFloorplanCanvasProps {
  floorplan: Floorplan | undefined;
  stands: Stand[];
  selectedStandId: string | null;
  exhibitorServices: ExhibitorServices[];
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  getExhibitorName: (id: string | null) => string | null;
  onStandClick: (standId: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

export const PublicFloorplanCanvas = forwardRef<HTMLDivElement, PublicFloorplanCanvasProps>(
  ({
    floorplan,
    stands,
    selectedStandId,
    exhibitorServices,
    zoom,
    pan,
    isPanning,
    getExhibitorName,
    onStandClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }, ref) => {
    return (
      <div
        className="flex-1 overflow-hidden bg-muted relative touch-none"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div
          ref={ref}
          className="canvas-bg absolute bg-editor-canvas border border-border rounded"
          style={{
            width: floorplan?.width || 1200,
            height: floorplan?.height || 800,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Background image */}
          {floorplan?.background_url && (
            <img
              src={floorplan.background_url}
              alt="Achtergrond"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ opacity: (floorplan.background_opacity || 100) / 100 }}
            />
          )}

          {/* Stands */}
          {stands.map((stand) => {
            const isSelected = stand.id === selectedStandId;
            const exhibitorName = getExhibitorName(stand.exhibitor_id);
            const standServices = stand.exhibitor_id
              ? exhibitorServices.find(s => s.exhibitor_id === stand.exhibitor_id)
              : null;
            const statusColor = STAND_STATUS_CONFIG[stand.status]?.color || '#3b82f6';
            const statusLabel = STAND_STATUS_CONFIG[stand.status]?.label || stand.status;

            return (
              <Tooltip key={stand.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`floorplan-stand ${isSelected ? 'floorplan-stand-selected' : ''} hover:ring-2 hover:ring-primary/50`}
                    style={{
                      left: stand.x,
                      top: stand.y,
                      width: stand.width,
                      height: stand.height,
                      backgroundColor: statusColor,
                      transform: `rotate(${stand.rotation}deg)`,
                      zIndex: isSelected ? 10 : 1,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStandClick(stand.id);
                    }}
                  >
                    <div className="text-center text-white pointer-events-none">
                      <div className="font-bold">{stand.label}</div>
                      {exhibitorName && (
                        <div className="text-[10px] opacity-80 truncate max-w-full px-1">
                          {exhibitorName}
                        </div>
                      )}
                    </div>

                    {/* Service icons */}
                    {standServices && (
                      <StandServiceIcons services={standServices} zoom={zoom} />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground">
                  <div className="text-sm">
                    <span className="font-semibold">{stand.label}</span>
                    {exhibitorName && (
                      <span className="text-muted-foreground"> — {exhibitorName}</span>
                    )}
                    <span className="text-xs ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: statusColor, color: '#fff' }}>
                      {statusLabel}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }
);

PublicFloorplanCanvas.displayName = 'PublicFloorplanCanvas';
