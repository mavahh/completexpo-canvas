import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEventRole } from '@/hooks/useEventRole';
import { useDarkMode } from '@/hooks/useDarkMode';
import { BackgroundUpload } from '@/components/floorplan/BackgroundUpload';
import { HallSelector } from '@/components/floorplan/HallSelector';
import { StandServiceIcons } from '@/components/floorplan/StandServiceIcons';
import { ExhibitorServicesPanel } from '@/components/floorplan/ExhibitorServicesPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  Grid3X3, 
  Loader2,
  Search,
  Trash2,
  RotateCcw,
  Check,
  Moon,
  Sun,
  Lock
} from 'lucide-react';

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
}

interface Exhibitor {
  id: string;
  name: string;
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
  event_id: string;
  name: string;
  hall: string | null;
  width: number;
  height: number;
  grid_size: number;
  background_url: string | null;
  background_opacity: number | null;
}

export default function FloorplanEditor() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, isReadOnly, loading: roleLoading } = useEventRole(eventId);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [selectedFloorplanId, setSelectedFloorplanId] = useState<string | null>(null);
  const [stands, setStands] = useState<Stand[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [exhibitorServices, setExhibitorServices] = useState<ExhibitorServices[]>([]);
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);
  const [activeExhibitorId, setActiveExhibitorId] = useState<string | null>(null);
  const [exhibitorSearch, setExhibitorSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<{ id: string; handle: string } | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, standX: 0, standY: 0 });

  const floorplan = floorplans.find((fp) => fp.id === selectedFloorplanId);
  const selectedStand = stands.find((s) => s.id === selectedStandId);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    if (!eventId) return;

    // Fetch all floorplans for this event
    const { data: floorplanData } = await supabase
      .from('floorplans')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');

    if (!floorplanData || floorplanData.length === 0) {
      // Create default floorplan if none exists
      const { data: newFloorplan } = await supabase
        .from('floorplans')
        .insert({
          event_id: eventId,
          name: 'Hal 1',
          width: 1200,
          height: 800,
          grid_size: 20,
        })
        .select()
        .single();

      if (newFloorplan) {
        setFloorplans([newFloorplan as Floorplan]);
        setSelectedFloorplanId(newFloorplan.id);
      }
    } else {
      setFloorplans(floorplanData as Floorplan[]);
      setSelectedFloorplanId(floorplanData[0].id);
    }

    // Fetch exhibitors and their services
    const { data: exhibitorsData } = await supabase
      .from('exhibitors')
      .select('id, name')
      .eq('event_id', eventId)
      .order('name');

    if (exhibitorsData) {
      setExhibitors(exhibitorsData);
      
      // Fetch services for all exhibitors
      const exhibitorIds = exhibitorsData.map(e => e.id);
      if (exhibitorIds.length > 0) {
        const { data: servicesData } = await supabase
          .from('exhibitor_services')
          .select('*')
          .in('exhibitor_id', exhibitorIds);
        
        if (servicesData) {
          setExhibitorServices(servicesData as ExhibitorServices[]);
        }
      }
    }

    setLoading(false);
  };

  // Fetch stands when floorplan changes
  useEffect(() => {
    if (!selectedFloorplanId) return;

    const fetchStands = async () => {
      const { data: standsData } = await supabase
        .from('stands')
        .select('*')
        .eq('floorplan_id', selectedFloorplanId);

      if (standsData) {
        setStands(standsData);
      }
    };

    fetchStands();
    setSelectedStandId(null);
  }, [selectedFloorplanId]);

  const snapToGrid = (value: number) => {
    if (!floorplan) return value;
    return Math.round(value / floorplan.grid_size) * floorplan.grid_size;
  };

  const addStand = async () => {
    if (!floorplan || !eventId || !canEdit) return;

    const existingLabels = stands.map((s) => s.label);
    let newLabel = 'A1';
    let counter = 1;
    while (existingLabels.includes(newLabel)) {
      counter++;
      newLabel = `A${counter}`;
    }

    const newStand: Omit<Stand, 'id'> = {
      floorplan_id: floorplan.id,
      event_id: eventId,
      exhibitor_id: activeExhibitorId,
      label: newLabel,
      x: snapToGrid(100 + pan.x * -1 / zoom),
      y: snapToGrid(100 + pan.y * -1 / zoom),
      width: 100,
      height: 60,
      rotation: 0,
      color: '#3b82f6',
      notes: null,
    };

    const { data, error } = await supabase
      .from('stands')
      .insert(newStand)
      .select()
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } else if (data) {
      setStands([...stands, data]);
      setSelectedStandId(data.id);
      setDirty(true);
    }
  };

  const updateStand = async (id: string, updates: Partial<Stand>) => {
    if (!canEdit) return;
    
    const standIndex = stands.findIndex((s) => s.id === id);
    if (standIndex === -1) return;

    const updatedStands = [...stands];
    updatedStands[standIndex] = { ...updatedStands[standIndex], ...updates };
    setStands(updatedStands);
    setDirty(true);
  };

  const deleteStand = async () => {
    if (!selectedStandId || !canEdit) return;

    const { error } = await supabase
      .from('stands')
      .delete()
      .eq('id', selectedStandId);

    if (error) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } else {
      setStands(stands.filter((s) => s.id !== selectedStandId));
      setSelectedStandId(null);
      setDirty(true);
    }
  };

  const saveAll = async () => {
    if (!canEdit) return;
    setSaving(true);

    try {
      for (const stand of stands) {
        await supabase
          .from('stands')
          .update({
            x: stand.x,
            y: stand.y,
            width: stand.width,
            height: stand.height,
            rotation: stand.rotation,
            label: stand.label,
            exhibitor_id: stand.exhibitor_id,
            color: stand.color,
            notes: stand.notes,
          })
          .eq('id', stand.id);
      }

      setDirty(false);
      toast({ title: 'Opgeslagen', description: 'Alle wijzigingen zijn opgeslagen' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, standId?: string) => {
    if (standId) {
      e.stopPropagation();
      const stand = stands.find((s) => s.id === standId);
      if (!stand) return;

      setSelectedStandId(standId);
      
      if (canEdit) {
        setDragging(standId);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: (e.clientX - rect.left) / zoom - stand.x,
            y: (e.clientY - rect.top) / zoom - stand.y,
          });
        }
      }
    } else if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedStandId(null);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (dragging && canEdit) {
      const stand = stands.find((s) => s.id === dragging);
      if (!stand) return;

      const newX = snapToGrid((e.clientX - rect.left) / zoom - dragOffset.x);
      const newY = snapToGrid((e.clientY - rect.top) / zoom - dragOffset.y);

      updateStand(dragging, { x: Math.max(0, newX), y: Math.max(0, newY) });
    } else if (resizing && canEdit) {
      const stand = stands.find((s) => s.id === resizing.id);
      if (!stand) return;

      const dx = (e.clientX - resizeStart.x) / zoom;
      const dy = (e.clientY - resizeStart.y) / zoom;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.standX;
      let newY = resizeStart.standY;

      if (resizing.handle.includes('e')) {
        newWidth = snapToGrid(Math.max(40, resizeStart.width + dx));
      }
      if (resizing.handle.includes('w')) {
        const deltaW = snapToGrid(dx);
        newWidth = Math.max(40, resizeStart.width - deltaW);
        newX = resizeStart.standX + (resizeStart.width - newWidth);
      }
      if (resizing.handle.includes('s')) {
        newHeight = snapToGrid(Math.max(40, resizeStart.height + dy));
      }
      if (resizing.handle.includes('n')) {
        const deltaH = snapToGrid(dy);
        newHeight = Math.max(40, resizeStart.height - deltaH);
        newY = resizeStart.standY + (resizeStart.height - newHeight);
      }

      updateStand(resizing.id, { width: newWidth, height: newHeight, x: newX, y: newY });
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [dragging, resizing, isPanning, stands, dragOffset, resizeStart, panStart, zoom, canEdit]);

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
    setIsPanning(false);
  };

  const handleResizeStart = (e: React.MouseEvent, standId: string, handle: string) => {
    if (!canEdit) return;
    e.stopPropagation();
    const stand = stands.find((s) => s.id === standId);
    if (!stand) return;

    setResizing({ id: standId, handle });
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: stand.width,
      height: stand.height,
      standX: stand.x,
      standY: stand.y,
    });
  };

  const handleBackgroundChange = (url: string | null, opacity: number) => {
    if (!selectedFloorplanId) return;
    setFloorplans((prev) =>
      prev.map((fp) =>
        fp.id === selectedFloorplanId
          ? { ...fp, background_url: url, background_opacity: opacity }
          : fp
      )
    );
  };

  const handleFloorplanAdded = (newFloorplan: Floorplan) => {
    setFloorplans((prev) => [...prev, newFloorplan]);
    setSelectedFloorplanId(newFloorplan.id);
  };

  const filteredExhibitors = exhibitors.filter((ex) =>
    ex.name.toLowerCase().includes(exhibitorSearch.toLowerCase())
  );

  const getExhibitorName = (id: string | null) => {
    if (!id) return null;
    return exhibitors.find((ex) => ex.id === id)?.name;
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-card border-b border-border p-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${eventId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Terug
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          
          {/* Hall selector */}
          <HallSelector
            eventId={eventId || ''}
            floorplans={floorplans}
            selectedFloorplanId={selectedFloorplanId}
            onSelect={setSelectedFloorplanId}
            onFloorplanAdded={handleFloorplanAdded}
            disabled={!canEdit}
          />
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {/* Zoom controls */}
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-14 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {/* Grid toggle */}
          <Button
            variant={showGrid ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          
          {/* Dark mode toggle */}
          <Button variant="outline" size="sm" onClick={toggleDarkMode}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          {/* Background upload */}
          {floorplan && (
            <BackgroundUpload
              floorplanId={floorplan.id}
              currentBackground={floorplan.background_url}
              currentOpacity={floorplan.background_opacity || 100}
              onBackgroundChange={handleBackgroundChange}
              disabled={!canEdit}
            />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isReadOnly && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
              <Lock className="w-3 h-3" />
              Alleen lezen
            </div>
          )}
          
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={addStand}>
                <Plus className="w-4 h-4 mr-1" />
                Stand toevoegen
              </Button>
              <Button size="sm" onClick={saveAll} disabled={saving || !dirty}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : dirty ? (
                  <Save className="w-4 h-4 mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                {dirty ? 'Opslaan' : 'Opgeslagen'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Exhibitors */}
        <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto">
          <h3 className="font-medium text-foreground mb-3">Exposanten</h3>
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken..."
              value={exhibitorSearch}
              onChange={(e) => setExhibitorSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="space-y-1">
            {filteredExhibitors.map((ex) => {
              const hasStand = stands.some((s) => s.exhibitor_id === ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => canEdit && setActiveExhibitorId(activeExhibitorId === ex.id ? null : ex.id)}
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

        {/* Canvas */}
        <div
          className="flex-1 overflow-hidden bg-muted relative"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            ref={canvasRef}
            className="canvas-bg absolute bg-editor-canvas border border-border rounded"
            style={{
              width: floorplan?.width || 1200,
              height: floorplan?.height || 800,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              cursor: isPanning ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => handleMouseDown(e)}
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
            {stands.map((stand) => {
              const isSelected = selectedStandId === stand.id;
              const exhibitorName = getExhibitorName(stand.exhibitor_id);
              const standServices = stand.exhibitor_id 
                ? exhibitorServices.find(s => s.exhibitor_id === stand.exhibitor_id) 
                : null;

              return (
                <div
                  key={stand.id}
                  className={`floorplan-stand ${isSelected ? 'floorplan-stand-selected' : ''}`}
                  style={{
                    left: stand.x,
                    top: stand.y,
                    width: stand.width,
                    height: stand.height,
                    backgroundColor: stand.color || '#3b82f6',
                    transform: `rotate(${stand.rotation}deg)`,
                    zIndex: isSelected ? 10 : 1,
                    cursor: canEdit ? 'move' : 'pointer',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, stand.id)}
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

                  {/* Resize handles - only for edit mode */}
                  {isSelected && canEdit && (
                    <>
                      <div
                        className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-nw-resize"
                        style={{ top: -6, left: -6 }}
                        onMouseDown={(e) => handleResizeStart(e, stand.id, 'nw')}
                      />
                      <div
                        className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-ne-resize"
                        style={{ top: -6, right: -6 }}
                        onMouseDown={(e) => handleResizeStart(e, stand.id, 'ne')}
                      />
                      <div
                        className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-sw-resize"
                        style={{ bottom: -6, left: -6 }}
                        onMouseDown={(e) => handleResizeStart(e, stand.id, 'sw')}
                      />
                      <div
                        className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-full cursor-se-resize"
                        style={{ bottom: -6, right: -6 }}
                        onMouseDown={(e) => handleResizeStart(e, stand.id, 'se')}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar - Properties */}
        <div className="w-72 bg-card border-l border-border p-4 overflow-y-auto">
          <h3 className="font-medium text-foreground mb-4">Eigenschappen</h3>

          {selectedStand ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Standnummer</Label>
                <Input
                  id="label"
                  value={selectedStand.label}
                  onChange={(e) => updateStand(selectedStand.id, { label: e.target.value })}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label>Exposant</Label>
                <Select
                  value={selectedStand.exhibitor_id || 'none'}
                  onValueChange={(value) =>
                    updateStand(selectedStand.id, { exhibitor_id: value === 'none' ? null : value })
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer exposant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen exposant</SelectItem>
                    {exhibitors.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canEdit && activeExhibitorId && !selectedStand.exhibitor_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => updateStand(selectedStand.id, { exhibitor_id: activeExhibitorId })}
                  >
                    Koppel actieve exposant
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="x">X</Label>
                  <Input
                    id="x"
                    type="number"
                    value={selectedStand.x}
                    onChange={(e) => updateStand(selectedStand.id, { x: Number(e.target.value) })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="y">Y</Label>
                  <Input
                    id="y"
                    type="number"
                    value={selectedStand.y}
                    onChange={(e) => updateStand(selectedStand.id, { y: Number(e.target.value) })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="width">Breedte</Label>
                  <Input
                    id="width"
                    type="number"
                    value={selectedStand.width}
                    onChange={(e) => updateStand(selectedStand.id, { width: Number(e.target.value) })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Hoogte</Label>
                  <Input
                    id="height"
                    type="number"
                    value={selectedStand.height}
                    onChange={(e) => updateStand(selectedStand.id, { height: Number(e.target.value) })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rotation">Rotatie (°)</Label>
                <Input
                  id="rotation"
                  type="number"
                  value={selectedStand.rotation}
                  onChange={(e) => updateStand(selectedStand.id, { rotation: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Kleur</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={selectedStand.color || '#3b82f6'}
                    onChange={(e) => updateStand(selectedStand.id, { color: e.target.value })}
                    className="w-12 h-10 p-1"
                    disabled={!canEdit}
                  />
                  <Input
                    value={selectedStand.color || '#3b82f6'}
                    onChange={(e) => updateStand(selectedStand.id, { color: e.target.value })}
                    className="flex-1"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notities</Label>
                <Textarea
                  id="notes"
                  value={selectedStand.notes || ''}
                  onChange={(e) => updateStand(selectedStand.id, { notes: e.target.value })}
                  rows={3}
                  disabled={!canEdit}
                />
              </div>

              {/* Exhibitor Services Panel */}
              <ExhibitorServicesPanel
                exhibitorName={getExhibitorName(selectedStand.exhibitor_id)}
                services={selectedStand.exhibitor_id 
                  ? exhibitorServices.find(s => s.exhibitor_id === selectedStand.exhibitor_id) || null
                  : null
                }
              />

              {canEdit && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-4"
                  onClick={deleteStand}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Stand verwijderen
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecteer een stand om de eigenschappen te {canEdit ? 'bewerken' : 'bekijken'}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
