import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StandPropertiesPanel } from './StandPropertiesPanel';
import { BulkActionsPanel } from './BulkActionsPanel';
import { WarningsPanelEnhanced, FloorplanWarning } from './WarningsPanelEnhanced';
import { AuditLogPanelEnhanced } from './AuditLogPanelEnhanced';
import type { Stand, ExhibitorMinimal, ExhibitorServices } from '@/types';
import { StandStatus } from './StandLegend';

interface FloorplanRightSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedStandIds: Set<string>;
  selectedStand: Stand | null;
  stands: Stand[];
  exhibitors: ExhibitorMinimal[];
  exhibitorServices: ExhibitorServices[];
  activeExhibitorId: string | null;
  warnings: FloorplanWarning[];
  eventId: string;
  selectedFloorplanId: string | null;
  canEdit: boolean;
  onUpdateStand: (id: string, updates: Partial<Stand>) => void;
  onUpdateStandWithAutoStatus: (id: string, updates: Partial<Stand>) => void;
  onDeleteStand: () => void;
  onSelectStand: (id: string) => void;
  onClearSelection: () => void;
  onBulkSetStatus: (status: StandStatus) => void;
  onBulkSnapToGrid: () => void;
  onBulkClearExhibitor: () => void;
  onBulkRotate: (degrees: number) => void;
  onExportLabels: () => void;
  onFixDuplicates?: () => void;
  onClampToBounds?: () => void;
  getExhibitorName: (id: string | null) => string | null;
}

export function FloorplanRightSidebar({
  activeTab,
  onTabChange,
  selectedStandIds,
  selectedStand,
  stands,
  exhibitors,
  exhibitorServices,
  activeExhibitorId,
  warnings,
  eventId,
  selectedFloorplanId,
  canEdit,
  onUpdateStand,
  onUpdateStandWithAutoStatus,
  onDeleteStand,
  onSelectStand,
  onClearSelection,
  onBulkSetStatus,
  onBulkSnapToGrid,
  onBulkClearExhibitor,
  onBulkRotate,
  onExportLabels,
  onFixDuplicates,
  onClampToBounds,
  getExhibitorName,
}: FloorplanRightSidebarProps) {
  return (
    <div className="w-full md:w-56 lg:w-64 xl:w-72 bg-card md:border-l border-border overflow-y-auto h-full max-w-xs">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
        <TabsList className="w-full rounded-none border-b border-border h-auto p-0 flex-shrink-0">
          <TabsTrigger value="properties" className="flex-1 py-2 text-xs sm:text-sm">Props</TabsTrigger>
          <TabsTrigger value="warnings" className="flex-1 relative py-2 text-xs sm:text-sm">
            Warn
            {warnings.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-warning text-warning-foreground text-[10px] rounded-full flex items-center justify-center">
                {warnings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-1 py-2 text-xs sm:text-sm">Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="properties" className="flex-1 p-3 sm:p-4 m-0 overflow-y-auto">
          {selectedStandIds.size > 1 ? (
            <BulkActionsPanel
              selectedCount={selectedStandIds.size}
              onSetStatus={onBulkSetStatus}
              onSnapToGrid={onBulkSnapToGrid}
              onClearExhibitor={onBulkClearExhibitor}
              onRotate={onBulkRotate}
              onExportLabels={onExportLabels}
              onClearSelection={onClearSelection}
              disabled={!canEdit}
            />
          ) : selectedStand ? (
            <StandPropertiesPanel
              stand={selectedStand}
              exhibitors={exhibitors}
              exhibitorServices={exhibitorServices}
              activeExhibitorId={activeExhibitorId}
              canEdit={canEdit}
              onUpdateStand={onUpdateStand}
              onUpdateStandWithAutoStatus={onUpdateStandWithAutoStatus}
              onDeleteStand={onDeleteStand}
              getExhibitorName={getExhibitorName}
            />
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Selecteer een stand om de eigenschappen te {canEdit ? 'bewerken' : 'bekijken'}.
              <br /><br />
              <span className="text-[10px] sm:text-xs">Tips:</span>
              <ul className="text-[10px] sm:text-xs mt-1 space-y-1 text-muted-foreground">
                <li>• Shift+klik voor multi-select</li>
                <li>• Spatie+slepen om te pannen</li>
                <li>• Scroll om te zoomen</li>
                <li>• F voor fullscreen</li>
              </ul>
            </p>
          )}
        </TabsContent>
        
        <TabsContent value="warnings" className="flex-1 p-3 sm:p-4 m-0 overflow-y-auto">
          <WarningsPanelEnhanced
            warnings={warnings}
            onSelectStand={onSelectStand}
            onFixDuplicates={onFixDuplicates}
            onClampToBounds={onClampToBounds}
          />
        </TabsContent>
        
        <TabsContent value="log" className="flex-1 p-3 sm:p-4 m-0 overflow-y-auto">
          {eventId && (
            <AuditLogPanelEnhanced
              eventId={eventId}
              floorplanId={selectedFloorplanId || undefined}
              onSelectStand={onSelectStand}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
