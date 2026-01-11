import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';
import { StandLegend, StandStatus } from './StandLegend';
import type { ExhibitorMinimal, Stand } from '@/types';

interface FloorplanLeftSidebarProps {
  statusFilters: Record<StandStatus, boolean>;
  statusCounts: Record<StandStatus, number>;
  exhibitors: ExhibitorMinimal[];
  stands: Stand[];
  exhibitorSearch: string;
  activeExhibitorId: string | null;
  canEdit: boolean;
  onFilterChange: (status: StandStatus, checked: boolean) => void;
  onExhibitorSearchChange: (search: string) => void;
  onExhibitorSelect: (id: string | null) => void;
}

export function FloorplanLeftSidebar({
  statusFilters,
  statusCounts,
  exhibitors,
  stands,
  exhibitorSearch,
  activeExhibitorId,
  canEdit,
  onFilterChange,
  onExhibitorSearchChange,
  onExhibitorSelect,
}: FloorplanLeftSidebarProps) {
  const filteredExhibitors = exhibitors.filter((ex) =>
    ex.name.toLowerCase().includes(exhibitorSearch.toLowerCase())
  );

  return (
    <div className="w-56 xl:w-64 bg-card border-r border-border p-3 xl:p-4 overflow-y-auto space-y-4">
      <StandLegend 
        filters={statusFilters} 
        onFilterChange={onFilterChange}
        counts={statusCounts}
      />
      
      <div>
        <h3 className="font-medium text-foreground mb-3">Exposanten</h3>
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoeken..."
            value={exhibitorSearch}
            onChange={(e) => onExhibitorSearchChange(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {filteredExhibitors.map((ex) => {
            const hasStand = stands.some((s) => s.exhibitor_id === ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => canEdit && onExhibitorSelect(activeExhibitorId === ex.id ? null : ex.id)}
                disabled={!canEdit}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeExhibitorId === ex.id
                    ? 'bg-primary text-primary-foreground'
                    : hasStand
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : canEdit
                    ? 'hover:bg-secondary text-foreground'
                    : 'text-muted-foreground cursor-default'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{ex.name}</span>
                  {hasStand && <Check className="w-3 h-3 flex-shrink-0" />}
                </div>
              </button>
            );
          })}
          {filteredExhibitors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Geen exposanten gevonden
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
