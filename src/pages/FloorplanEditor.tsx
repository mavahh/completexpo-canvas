import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useEventRole } from '@/hooks/useEventRole';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAuditLog } from '@/hooks/useAuditLog';
import { BackgroundUpload } from '@/components/floorplan/BackgroundUpload';
import { HallSelector } from '@/components/floorplan/HallSelector';
import { StandServiceIcons } from '@/components/floorplan/StandServiceIcons';
import { ExhibitorServicesPanel } from '@/components/floorplan/ExhibitorServicesPanel';
import { StandLegend, STAND_STATUS_CONFIG, StandStatus } from '@/components/floorplan/StandLegend';
import { StandStatusSelect } from '@/components/floorplan/StandStatusSelect';
import { BulkActionsPanel } from '@/components/floorplan/BulkActionsPanel';
import { AutoLabelingModal, LabelingConfig } from '@/components/floorplan/AutoLabelingModal';
import { WarningsPanel, FloorplanWarning } from '@/components/floorplan/WarningsPanel';
import { AuditLogPanel } from '@/components/floorplan/AuditLogPanel';
import { ExportDialog, ExportOptions } from '@/components/floorplan/ExportDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, Plus, Save, ZoomIn, ZoomOut, Grid3X3, Loader2,
  Search, Trash2, RotateCcw, Check, Moon, Sun, Lock,
  Tag, Download, AlertTriangle
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
  status: StandStatus;
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
  const { log: auditLog } = useAuditLog();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [selectedFloorplanId, setSelectedFloorplanId] = useState<string | null>(null);
  const [stands, setStands] = useState<Stand[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [exhibitorServices, setExhibitorServices] = useState<ExhibitorServices[]>([]);
  const [selectedStandIds, setSelectedStandIds] = useState<Set<string>>(new Set());
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
  const [statusFilters, setStatusFilters] = useState<Record<StandStatus, boolean>>({
    AVAILABLE: true,
    RESERVED: true,
    SOLD: true,
    BLOCKED: true,
  });
  const [showLabelingModal, setShowLabelingModal] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [eventName, setEventName] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState('properties');

  const floorplan = floorplans.find((fp) => fp.id === selectedFloorplanId);
  const selectedStand = selectedStandIds.size === 1 
    ? stands.find((s) => selectedStandIds.has(s.id)) 
    : null;

  // Calculate warnings
  const warnings: FloorplanWarning[] = [];
  
  // Check for duplicate labels
  const labelCounts = new Map<string, string[]>();
  stands.forEach(s => {
    const existing = labelCounts.get(s.label) || [];
    existing.push(s.id);
    labelCounts.set(s.label, existing);
  });
  labelCounts.forEach((ids, label) => {
    if (ids.length > 1) {
      ids.forEach(id => {
        warnings.push({
          type: 'duplicate',
          standId: id,
          standLabel: label,
          message: `Label "${label}" komt ${ids.length}x voor`,
        });
      });
    }
  });

  // Check for overlaps (simple AABB)
  for (let i = 0; i < stands.length; i++) {
    for (let j = i + 1; j < stands.length; j++) {
      const a = stands[i];
      const b = stands[j];
      if (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      ) {
        warnings.push({
          type: 'overlap',
          standId: a.id,
          standLabel: a.label,
          message: `Overlapt met ${b.label}`,
        });
      }
    }
  }

  // Check for out of bounds
  if (floorplan) {
    stands.forEach(s => {
      if (s.x < 0 || s.y < 0 || s.x + s.width > floorplan.width || s.y + s.height > floorplan.height) {
        warnings.push({
          type: 'out-of-bounds',
          standId: s.id,
          standLabel: s.label,
          message: 'Buiten canvas grenzen',
        });
      }
    });
  }

  // Status counts for legend
  const statusCounts: Record<StandStatus, number> = {
    AVAILABLE: stands.filter(s => s.status === 'AVAILABLE').length,
    RESERVED: stands.filter(s => s.status === 'RESERVED').length,
    SOLD: stands.filter(s => s.status === 'SOLD').length,
    BLOCKED: stands.filter(s => s.status === 'BLOCKED').length,
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    if (!eventId) return;

    // Fetch event name
    const { data: eventData } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();
    
    if (eventData) {
      setEventName(eventData.name);
    }

    // Fetch all floorplans for this event
    const { data: floorplanData } = await supabase
      .from('floorplans')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');

    if (!floorplanData || floorplanData.length === 0) {
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

  useEffect(() => {
    if (!selectedFloorplanId) return;

    const fetchStands = async () => {
      const { data: standsData } = await supabase
        .from('stands')
        .select('*')
        .eq('floorplan_id', selectedFloorplanId);

      if (standsData) {
        setStands(standsData.map(s => ({
          ...s,
          status: (s.status as StandStatus) || 'AVAILABLE'
        })));
      }
    };

    fetchStands();
    setSelectedStandIds(new Set());
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

    const newStatus: StandStatus = activeExhibitorId ? 'SOLD' : 'AVAILABLE';

    const newStand = {
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
      status: newStatus,
    };

    const { data, error } = await supabase
      .from('stands')
      .insert(newStand)
      .select()
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } else if (data) {
      const stand = { ...data, status: data.status as StandStatus };
      setStands([...stands, stand]);
      setSelectedStandIds(new Set([data.id]));
      setDirty(true);
      
      auditLog({
        event_id: eventId,
        floorplan_id: floorplan.id,
        action: 'stand.create',
        entity_type: 'stand',
        entity_id: data.id,
        diff: { label: newLabel, status: newStatus },
      });
    }
  };

  const updateStand = async (id: string, updates: Partial<Stand>) => {
    if (!canEdit) return;
    
    const standIndex = stands.findIndex((s) => s.id === id);
    if (standIndex === -1) return;

    const oldStand = stands[standIndex];
    const updatedStands = [...stands];
    updatedStands[standIndex] = { ...oldStand, ...updates };
    setStands(updatedStands);
    setDirty(true);
  };

  const updateStandWithAutoStatus = (id: string, updates: Partial<Stand>) => {
    const stand = stands.find(s => s.id === id);
    if (!stand) return;

    // Auto-status logic
    if ('exhibitor_id' in updates) {
      if (updates.exhibitor_id && !stand.exhibitor_id && stand.status === 'AVAILABLE') {
        updates.status = 'SOLD';
      } else if (!updates.exhibitor_id && stand.exhibitor_id && stand.status === 'SOLD') {
        updates.status = 'AVAILABLE';
      }
    }

    updateStand(id, updates);
  };

  const deleteStand = async () => {
    if (selectedStandIds.size === 0 || !canEdit || !eventId) return;

    for (const standId of selectedStandIds) {
      const stand = stands.find(s => s.id === standId);
      const { error } = await supabase
        .from('stands')
        .delete()
        .eq('id', standId);

      if (!error && stand) {
        auditLog({
          event_id: eventId,
          floorplan_id: selectedFloorplanId || undefined,
          action: 'stand.delete',
          entity_type: 'stand',
          entity_id: standId,
          diff: { label: stand.label },
        });
      }
    }

    setStands(stands.filter((s) => !selectedStandIds.has(s.id)));
    setSelectedStandIds(new Set());
    setDirty(true);
  };

  const saveAll = async () => {
    if (!canEdit || !eventId) return;
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
            status: stand.status,
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

      // Shift-click for multi-select
      if (e.shiftKey) {
        setSelectedStandIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(standId)) {
            newSet.delete(standId);
          } else {
            newSet.add(standId);
          }
          return newSet;
        });
      } else {
        setSelectedStandIds(new Set([standId]));
      }
      
      if (canEdit && !e.shiftKey) {
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
      if (!e.shiftKey) {
        setSelectedStandIds(new Set());
      }
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
    if (!selectedFloorplanId || !eventId) return;
    setFloorplans((prev) =>
      prev.map((fp) =>
        fp.id === selectedFloorplanId
          ? { ...fp, background_url: url, background_opacity: opacity }
          : fp
      )
    );
    
    auditLog({
      event_id: eventId,
      floorplan_id: selectedFloorplanId,
      action: 'floorplan.background_upload',
      entity_type: 'floorplan',
      entity_id: selectedFloorplanId,
    });
  };

  const handleFloorplanAdded = (newFloorplan: Floorplan) => {
    setFloorplans((prev) => [...prev, newFloorplan]);
    setSelectedFloorplanId(newFloorplan.id);
  };

  // Bulk actions
  const handleBulkSetStatus = (status: StandStatus) => {
    if (!eventId) return;
    selectedStandIds.forEach(id => updateStand(id, { status }));
    auditLog({
      event_id: eventId,
      floorplan_id: selectedFloorplanId || undefined,
      action: 'stand.bulk_update',
      entity_type: 'stand',
      diff: { status, count: selectedStandIds.size },
    });
  };

  const handleBulkSnapToGrid = () => {
    selectedStandIds.forEach(id => {
      const stand = stands.find(s => s.id === id);
      if (stand) {
        updateStand(id, {
          x: snapToGrid(stand.x),
          y: snapToGrid(stand.y),
          width: snapToGrid(stand.width),
          height: snapToGrid(stand.height),
        });
      }
    });
  };

  const handleBulkClearExhibitor = () => {
    selectedStandIds.forEach(id => {
      updateStandWithAutoStatus(id, { exhibitor_id: null });
    });
  };

  const handleBulkRotate = (degrees: number) => {
    selectedStandIds.forEach(id => {
      const stand = stands.find(s => s.id === id);
      if (stand) {
        updateStand(id, { rotation: (stand.rotation + degrees) % 360 });
      }
    });
  };

  const handleExportLabels = () => {
    const selectedStands = stands.filter(s => selectedStandIds.has(s.id));
    const csv = ['Label,Status,Exhibitor'];
    selectedStands.forEach(s => {
      const exhibitorName = exhibitors.find(e => e.id === s.exhibitor_id)?.name || '';
      csv.push(`${s.label},${s.status},${exhibitorName}`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stands-export.csv';
    a.click();
  };

  // Auto labeling
  const handleApplyLabels = (config: LabelingConfig) => {
    if (!eventId) return;
    const targetStands = config.applyToSelected 
      ? stands.filter(s => selectedStandIds.has(s.id))
      : [...stands];
    
    // Sort by position (y then x)
    targetStands.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 20) return a.x - b.x;
      return a.y - b.y;
    });

    targetStands.forEach((stand, index) => {
      const num = config.startNumber + index;
      const label = `${config.prefix}${num.toString().padStart(config.padding, '0')}`;
      updateStand(stand.id, { label });
    });

    setDirty(true);
    
    auditLog({
      event_id: eventId,
      floorplan_id: selectedFloorplanId || undefined,
      action: 'stand.labels_generated',
      entity_type: 'stand',
      diff: { prefix: config.prefix, count: targetStands.length },
    });
  };

  // Fix warnings
  const handleFixDuplicates = () => {
    const usedLabels = new Set<string>();
    const updates: { id: string; label: string }[] = [];
    
    stands.forEach(stand => {
      if (usedLabels.has(stand.label)) {
        let counter = 1;
        let newLabel = `${stand.label}_${counter}`;
        while (usedLabels.has(newLabel)) {
          counter++;
          newLabel = `${stand.label}_${counter}`;
        }
        updates.push({ id: stand.id, label: newLabel });
        usedLabels.add(newLabel);
      } else {
        usedLabels.add(stand.label);
      }
    });

    updates.forEach(({ id, label }) => updateStand(id, { label }));
    setDirty(true);
  };

  const handleClampToBounds = () => {
    if (!floorplan) return;
    stands.forEach(stand => {
      const clampedX = Math.max(0, Math.min(stand.x, floorplan.width - stand.width));
      const clampedY = Math.max(0, Math.min(stand.y, floorplan.height - stand.height));
      if (clampedX !== stand.x || clampedY !== stand.y) {
        updateStand(stand.id, { x: clampedX, y: clampedY });
      }
    });
    setDirty(true);
  };

  // Export
  const handleExport = async (options: ExportOptions) => {
    // Simple PNG export using canvas
    if (!canvasRef.current) return;
    
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `${eventName}-${floorplan?.name || 'floorplan'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({ title: 'Geëxporteerd', description: 'Plattegrond is gedownload' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Export mislukt', description: 'Kon plattegrond niet exporteren' });
    }
  };

  const filteredExhibitors = exhibitors.filter((ex) =>
    ex.name.toLowerCase().includes(exhibitorSearch.toLowerCase())
  );

  const getExhibitorName = (id: string | null) => {
    if (!id) return null;
    return exhibitors.find((ex) => ex.id === id)?.name;
  };

  const filteredStands = stands.filter(s => statusFilters[s.status]);

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
          
          <HallSelector
            eventId={eventId || ''}
            floorplans={floorplans}
            selectedFloorplanId={selectedFloorplanId}
            onSelect={setSelectedFloorplanId}
            onFloorplanAdded={handleFloorplanAdded}
            disabled={!canEdit}
          />
          
          <div className="w-px h-6 bg-border mx-2" />
          
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
          
          <Button
            variant={showGrid ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={toggleDarkMode}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          {floorplan && (
            <BackgroundUpload
              floorplanId={floorplan.id}
              currentBackground={floorplan.background_url}
              currentOpacity={floorplan.background_opacity || 100}
              onBackgroundChange={handleBackgroundChange}
              disabled={!canEdit}
            />
          )}
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowLabelingModal(true)}>
                <Tag className="w-4 h-4 mr-1" />
                Labels
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isReadOnly && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
              <Lock className="w-3 h-3" />
              Alleen lezen
            </div>
          )}
          
          {warnings.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-warning bg-warning/10 px-3 py-1.5 rounded-md">
              <AlertTriangle className="w-3 h-3" />
              {warnings.length} waarschuwing{warnings.length !== 1 ? 'en' : ''}
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
        {/* Left sidebar - Exhibitors + Legend */}
        <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto space-y-4">
          <StandLegend 
            filters={statusFilters} 
            onFilterChange={(status, checked) => 
              setStatusFilters(prev => ({ ...prev, [status]: checked }))
            }
            counts={statusCounts}
          />
          
          <div>
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
            <div className="space-y-1 max-h-64 overflow-y-auto">
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
            {floorplan?.background_url && (
              <img
                src={floorplan.background_url}
                alt="Achtergrond"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ opacity: (floorplan.background_opacity || 100) / 100 }}
              />
            )}
            
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(hsl(var(--editor-grid)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--editor-grid)) 1px, transparent 1px)`,
                  backgroundSize: `${floorplan?.grid_size || 20}px ${floorplan?.grid_size || 20}px`,
                }}
              />
            )}
            
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

                  {standServices && (
                    <StandServiceIcons services={standServices} zoom={zoom} />
                  )}

                  {isSelected && canEdit && selectedStandIds.size === 1 && (
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

        {/* Right sidebar - Properties / Warnings / Log */}
        <div className="w-72 bg-card border-l border-border overflow-y-auto">
          <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="h-full flex flex-col">
            <TabsList className="w-full rounded-none border-b border-border">
              <TabsTrigger value="properties" className="flex-1">Eigenschappen</TabsTrigger>
              <TabsTrigger value="warnings" className="flex-1 relative">
                Warnings
                {warnings.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-warning text-warning-foreground text-[10px] rounded-full flex items-center justify-center">
                    {warnings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="log" className="flex-1">Log</TabsTrigger>
            </TabsList>
            
            <TabsContent value="properties" className="flex-1 p-4 m-0 overflow-y-auto">
              {selectedStandIds.size > 1 ? (
                <BulkActionsPanel
                  selectedCount={selectedStandIds.size}
                  onSetStatus={handleBulkSetStatus}
                  onSnapToGrid={handleBulkSnapToGrid}
                  onClearExhibitor={handleBulkClearExhibitor}
                  onRotate={handleBulkRotate}
                  onExportLabels={handleExportLabels}
                  onClearSelection={() => setSelectedStandIds(new Set())}
                  disabled={!canEdit}
                />
              ) : selectedStand ? (
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
                    <Label>Status</Label>
                    <StandStatusSelect
                      value={selectedStand.status}
                      onChange={(status) => updateStand(selectedStand.id, { status })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Exposant</Label>
                    <Select
                      value={selectedStand.exhibitor_id || 'none'}
                      onValueChange={(value) =>
                        updateStandWithAutoStatus(selectedStand.id, { exhibitor_id: value === 'none' ? null : value })
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
                        onClick={() => updateStandWithAutoStatus(selectedStand.id, { exhibitor_id: activeExhibitorId })}
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
                    <Label htmlFor="notes">Notities</Label>
                    <Textarea
                      id="notes"
                      value={selectedStand.notes || ''}
                      onChange={(e) => updateStand(selectedStand.id, { notes: e.target.value })}
                      rows={3}
                      disabled={!canEdit}
                    />
                  </div>

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
                  <br /><br />
                  <span className="text-xs">Tip: Gebruik Shift+klik voor multi-select.</span>
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="warnings" className="flex-1 p-4 m-0 overflow-y-auto">
              <WarningsPanel
                warnings={warnings}
                onSelectStand={(id) => setSelectedStandIds(new Set([id]))}
                onFixDuplicates={canEdit ? handleFixDuplicates : undefined}
                onClampToBounds={canEdit ? handleClampToBounds : undefined}
              />
            </TabsContent>
            
            <TabsContent value="log" className="flex-1 p-4 m-0 overflow-y-auto">
              {eventId && (
                <AuditLogPanel
                  eventId={eventId}
                  floorplanId={selectedFloorplanId || undefined}
                  onSelectStand={(id) => setSelectedStandIds(new Set([id]))}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <AutoLabelingModal
        open={showLabelingModal}
        onClose={() => setShowLabelingModal(false)}
        onApply={handleApplyLabels}
        selectedCount={selectedStandIds.size}
        totalCount={stands.length}
      />
      
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        eventName={eventName}
        floorplanName={floorplan?.name || 'Floorplan'}
      />
    </div>
  );
}
