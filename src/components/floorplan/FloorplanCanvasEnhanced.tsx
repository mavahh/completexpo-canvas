import { forwardRef } from 'react';
import { StandServiceIcons } from './StandServiceIcons';
import { STAND_STATUS_CONFIG, StandStatus } from './StandLegend';
import type { Stand, Floorplan, ExhibitorServices } from '@/types';
import { EditorTool } from '@/hooks/floorplan/useDrawMode';

interface FloorplanCanvasProps {
  floorplan: Floorplan | undefined;
  stands: Stand[];
  selectedStandIds: Set<string>;
  exhibitorServices: ExhibitorServices[];
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  isPanning: boolean;
  spacePressed: boolean;
  canEdit: boolean;
  statusFilters: Record<StandStatus, boolean>;
  getExhibitorName: (id: string | null) => string | null;
  onMouseDown: (e: React.MouseEvent, standId?: string) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onResizeStart: (e: React.MouseEvent, standId: string, handle: string) => void;
  // Draw mode props
  activeTool?: EditorTool;
  drawRect?: { x: number; y: number; width: number; height: number } | null;
  performanceMode?: boolean;
}

export const FloorplanCanvasEnhanced = forwardRef<HTMLDivElement, FloorplanCanvasProps>(
  ({
    floorplan,
    stands,
    selectedStandIds,
    exhibitorServices,
    zoom,
    pan,
    showGrid,
    isPanning,
    spacePressed,
    canEdit,
    statusFilters,
    getExhibitorName,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onResizeStart,
    activeTool = 'select',
    drawRect,
    performanceMode = false,
  }, ref) => {
    const filteredStands = stands.filter(s => statusFilters[s.status]);
    const isDrawMode = activeTool === 'draw';

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
            cursor: isDrawMode ? 'crosshair' : spacePressed || isPanning ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => onMouseDown(e)}
        >
          {/* Background image - hide in performance mode */}
          {floorplan?.background_url && !performanceMode && (
            <img
              src={floorplan.background_url}
              alt="Achtergrond"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ opacity: (floorplan.background_opacity || 100) / 100 }}
            />
          )}

          {/* Draw rectangle preview */}
          {drawRect && (
            <div
              className="absolute border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
              style={{
                left: drawRect.x,
                top: drawRect.y,
                width: drawRect.width,
                height: drawRect.height,
              }}
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
            const statusColor = STAND_STATUS_CONFIG[stand.status]?.color || '#3b82f6';

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
                  cursor: spacePressed ? 'grab' : canEdit ? 'move' : 'pointer',
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
                    <div
                      className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-n-resize"
                      style={{ top: -6, left: '50%', marginLeft: -6 }}
                      onMouseDown={(e) => onResizeStart(e, stand.id, 'n')}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-s-resize"
                      style={{ bottom: -6, left: '50%', marginLeft: -6 }}
                      onMouseDown={(e) => onResizeStart(e, stand.id, 's')}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-e-resize"
                      style={{ right: -6, top: '50%', marginTop: -6 }}
                      onMouseDown={(e) => onResizeStart(e, stand.id, 'e')}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-w-resize"
                      style={{ left: -6, top: '50%', marginTop: -6 }}
                      onMouseDown={(e) => onResizeStart(e, stand.id, 'w')}
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

FloorplanCanvasEnhanced.displayName = 'FloorplanCanvasEnhanced';
