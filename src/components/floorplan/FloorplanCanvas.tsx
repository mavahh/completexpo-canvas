import { forwardRef, useCallback } from 'react';
import { StandServiceIcons } from './StandServiceIcons';
import { STAND_STATUS_CONFIG, StandStatus } from './StandLegend';

interface Stand {
  id: string;
  floorplan_id: string;
  event_id: string;
  exhibitor_id: string | null;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string | null;
  notes: string | null;
  status: StandStatus;
}

interface ExhibitorServices {
  exhibitor_id: string;
  water_connections: number;
  power_option: string;
  light_points: number;
  construction_booked: boolean;
  carpet_included: boolean;
  surface_type: string;
}

interface Floorplan {
  id: string;
  width: number;
  height: number;
  grid_size: number;
  background_url: string | null;
  background_opacity: number | null;
}

interface FloorplanCanvasProps {
  floorplan: Floorplan | undefined;
  stands: Stand[];
  selectedStandIds: Set<string>;
  exhibitorServices: ExhibitorServices[];
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  isPanning: boolean;
  canEdit: boolean;
  statusFilters: Record<StandStatus, boolean>;
  getExhibitorName: (id: string | null) => string | null;
  onMouseDown: (e: React.MouseEvent, standId?: string) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onResizeStart: (e: React.MouseEvent, standId: string, handle: string) => void;
}

export const FloorplanCanvas = forwardRef<HTMLDivElement, FloorplanCanvasProps>(
  ({
    floorplan,
    stands,
    selectedStandIds,
    exhibitorServices,
    zoom,
    pan,
    showGrid,
    isPanning,
    canEdit,
    statusFilters,
    getExhibitorName,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onResizeStart,
  }, ref) => {
    const getStatusColor = (status: StandStatus) => {
      return STAND_STATUS_CONFIG[status]?.color || '#3b82f6';
    };

    const filteredStands = stands.filter(stand => statusFilters[stand.status]);

    return (
      <div
        className="flex-1 overflow-hidden bg-muted relative"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          ref={ref}
          className="canvas-bg absolute bg-editor-canvas border border-border rounded"
          style={{
            width: floorplan?.width || 1200,
            height: floorplan?.height || 800,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => onMouseDown(e)}
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
          
          {/* Grid overlay */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--editor-grid)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--editor-grid)) 1px, transparent 1px)`,
                backgroundSize: `${floorplan?.grid_size || 20}px ${floorplan?.grid_size || 20}px`,
              }}
            />
          )}
          
          {/* Stands */}
          {filteredStands.map((stand) => {
            const isSelected = selectedStandIds.has(stand.id);
            const exhibitorName = getExhibitorName(stand.exhibitor_id);
            const standServices = stand.exhibitor_id 
              ? exhibitorServices.find(s => s.exhibitor_id === stand.exhibitor_id) 
              : null;
            const statusColor = getStatusColor(stand.status);

            return (
              <div
                key={stand.id}
                className={`floorplan-stand ${isSelected ? 'floorplan-stand-selected' : ''}`}
                style={{
                  left: stand.x,
                  top: stand.y,
                  width: stand.width,
                  height: stand.height,
                  backgroundColor: statusColor,
                  transform: `rotate(${stand.rotation}deg)`,
                  zIndex: isSelected ? 10 : 1,
                  cursor: canEdit ? 'move' : 'pointer',
                }}
                onMouseDown={(e) => onMouseDown(e, stand.id)}
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

                {/* Resize handles - only for edit mode and single selection */}
                {isSelected && canEdit && selectedStandIds.size === 1 && (
                  <>
                    <div
                      className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-nw-resize"
                      style={{ top: -6, left: -6 }}
                      onMouseDown={(e) => onResizeStart(e, stand.id, 'nw')}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-ne-resize"
                      style={{ top: -6, right: -6 }}
                      onMouseDown={(e) => onResizeStart(e, stand.id, 'ne')}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-sw-resize"
                      style={{ bottom: -6, left: -6 }}
                      onMouseDown={(e) => onResizeStart(e, stand.id, 'sw')}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-se-resize"
                      style={{ bottom: -6, right: -6 }}
                      onMouseDown={(e) => onResizeStart(e, stand.id, 'se')}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

FloorplanCanvas.displayName = 'FloorplanCanvas';
