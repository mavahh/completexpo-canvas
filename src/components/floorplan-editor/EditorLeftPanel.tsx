/**
 * EditorLeftPanel – exhibitor search/list + stands list.
 */

import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, MapPin, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { LayoutObject, LayoutStand } from '@/types/floorplan-editor';

interface Exhibitor {
  id: string;
  name: string;
}

interface EditorLeftPanelProps {
  objects: LayoutObject[];
  exhibitors: Exhibitor[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function EditorLeftPanel({
  objects, exhibitors, selectedIds, onSelect,
  collapsed, onToggleCollapse,
}: EditorLeftPanelProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('exhibitors');

  const stands = useMemo(() =>
    objects.filter((o): o is LayoutStand => o.type === 'stand'),
    [objects]
  );

  const filteredExhibitors = useMemo(() => {
    if (!search) return exhibitors;
    const q = search.toLowerCase();
    return exhibitors.filter(e => e.name.toLowerCase().includes(q));
  }, [exhibitors, search]);

  const filteredStands = useMemo(() => {
    if (!search) return stands;
    const q = search.toLowerCase();
    return stands.filter(s => s.label?.toLowerCase().includes(q));
  }, [stands, search]);

  if (collapsed) {
    return (
      <div className="w-8 border-r border-border bg-card flex flex-col items-center pt-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-56 border-r border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Exposanten</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onToggleCollapse}>
          <ChevronLeft className="w-3 h-3" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek exposant…"
            className="h-7 text-xs pl-7"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 h-7">
          <TabsTrigger value="exhibitors" className="text-xs h-6 gap-1">
            <User className="w-3 h-3" /> Bedrijf
          </TabsTrigger>
          <TabsTrigger value="stands" className="text-xs h-6 gap-1">
            <MapPin className="w-3 h-3" /> Stand
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exhibitors" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="px-1 py-1 space-y-0.5">
              {filteredExhibitors.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">Geen exposanten</p>
              ) : (
                filteredExhibitors.map(ex => {
                  const assignedStands = stands.filter(s => s.exhibitorId === ex.id);
                  return (
                    <button
                      key={ex.id}
                      className="w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors"
                      onClick={() => {
                        const ids = new Set(assignedStands.map(s => s.id));
                        if (ids.size > 0) onSelect(ids);
                      }}
                    >
                      <span className="font-medium text-foreground">{ex.name}</span>
                      {assignedStands.length > 0 && (
                        <span className="text-muted-foreground ml-1">({assignedStands.map(s => s.label).join(', ')})</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="stands" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="px-1 py-1 space-y-0.5">
              {filteredStands.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">Geen stands</p>
              ) : (
                filteredStands.map(stand => (
                  <button
                    key={stand.id}
                    className={cn(
                      'w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors',
                      selectedIds.has(stand.id) && 'bg-primary/10 text-primary'
                    )}
                    onClick={() => onSelect(new Set([stand.id]))}
                  >
                    <span className="font-medium">{stand.label || stand.id.slice(0, 8)}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
