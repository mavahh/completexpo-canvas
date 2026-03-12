import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { Stand, Floorplan, ExhibitorMinimal, ExhibitorServices } from '@/types';
import { StandStatus, STAND_STATUS_CONFIG } from '@/components/floorplan/StandLegend';
import { FloorplanWarning } from '@/components/floorplan/WarningsPanelEnhanced';
import { LabelingConfigEnhanced, LabelingResult } from '@/components/floorplan/LabelingModalEnhanced';
import { StatusFilters } from './types';

interface UseFloorplanDataProps {
  eventId: string | undefined;
  canEdit: boolean;
}

export function useFloorplanData({ eventId, canEdit }: UseFloorplanDataProps) {
  const { toast } = useToast();
  const { log: auditLog } = useAuditLog();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [selectedFloorplanId, setSelectedFloorplanId] = useState<string | null>(null);
  const [stands, setStands] = useState<Stand[]>([]);
  const [exhibitors, setExhibitors] = useState<ExhibitorMinimal[]>([]);
  const [exhibitorServices, setExhibitorServices] = useState<ExhibitorServices[]>([]);
  const [selectedStandIds, setSelectedStandIds] = useState<Set<string>>(new Set());
  const [activeExhibitorId, setActiveExhibitorId] = useState<string | null>(null);
  const [exhibitorSearch, setExhibitorSearch] = useState('');
  const [eventName, setEventName] = useState('');
  const [statusFilters, setStatusFilters] = useState<StatusFilters>({
    AVAILABLE: true,
    RESERVED: true,
    SOLD: true,
    BLOCKED: true,
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const floorplan = useMemo(() => 
    floorplans.find((fp) => fp.id === selectedFloorplanId),
    [floorplans, selectedFloorplanId]
  );

  const selectedStand = useMemo(() => 
    selectedStandIds.size === 1 
      ? stands.find((s) => selectedStandIds.has(s.id)) || null
      : null,
    [selectedStandIds, stands]
  );

  // Calculate warnings
  const warnings = useMemo<FloorplanWarning[]>(() => {
    const result: FloorplanWarning[] = [];
    
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
          result.push({
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
          result.push({
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
          result.push({
            type: 'out-of-bounds',
            standId: s.id,
            standLabel: s.label,
            message: 'Buiten canvas grenzen',
          });
        }
      });
    }

    // Check for missing labels
    stands.forEach(s => {
      if (!s.label || s.label.trim() === '') {
        result.push({
          type: 'missing-label',
          standId: s.id,
          standLabel: '(leeg)',
          message: 'Ontbrekend label',
        });
      }
    });

    return result;
  }, [stands, floorplan]);

  // Status counts for legend
  const statusCounts = useMemo<Record<StandStatus, number>>(() => ({
    AVAILABLE: stands.filter(s => s.status === 'AVAILABLE').length,
    RESERVED: stands.filter(s => s.status === 'RESERVED').length,
    SOLD: stands.filter(s => s.status === 'SOLD').length,
    BLOCKED: stands.filter(s => s.status === 'BLOCKED').length,
  }), [stands]);

  const filteredExhibitors = useMemo(() => 
    exhibitors.filter((ex) =>
      ex.name.toLowerCase().includes(exhibitorSearch.toLowerCase())
    ),
    [exhibitors, exhibitorSearch]
  );

  const filteredStands = useMemo(() => 
    stands.filter(s => statusFilters[s.status]),
    [stands, statusFilters]
  );

  const getExhibitorName = useCallback((id: string | null) => {
    if (!id) return null;
    return exhibitors.find((ex) => ex.id === id)?.name || null;
  }, [exhibitors]);

  const fetchData = useCallback(async () => {
    if (!eventId) return;

    const { data: eventData } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();
    
    if (eventData) {
      setEventName(eventData.name);
    }

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
  }, [eventId]);

  const fetchStands = useCallback(async () => {
    if (!selectedFloorplanId) return;

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
    setSelectedStandIds(new Set());
  }, [selectedFloorplanId]);

  const updateStand = useCallback((id: string, updates: Partial<Stand>) => {
    if (!canEdit) return;
    
    setStands(prev => {
      const standIndex = prev.findIndex((s) => s.id === id);
      if (standIndex === -1) return prev;

      const updatedStands = [...prev];
      updatedStands[standIndex] = { ...prev[standIndex], ...updates };
      return updatedStands;
    });
    setDirty(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {}, 800);
  }, [canEdit]);

  const updateStandWithAutoStatus = useCallback((id: string, updates: Partial<Stand>) => {
    const stand = stands.find(s => s.id === id);
    if (!stand) return;

    if ('exhibitor_id' in updates) {
      if (updates.exhibitor_id && !stand.exhibitor_id && stand.status === 'AVAILABLE') {
        updates.status = 'SOLD';
      } else if (!updates.exhibitor_id && stand.exhibitor_id && stand.status === 'SOLD') {
        updates.status = 'AVAILABLE';
      }
    }

    updateStand(id, updates);
  }, [stands, updateStand]);

  const addStand = useCallback(async () => {
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
      x: 100,
      y: 100,
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
      setStands(prev => [...prev, stand]);
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
  }, [floorplan, eventId, canEdit, stands, activeExhibitorId, toast, auditLog]);

  // Add stand with specific size (for draw mode)
  const addStandWithSize = useCallback(async (x: number, y: number, width: number, height: number) => {
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
      x,
      y,
      width,
      height,
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
      setStands(prev => [...prev, stand]);
      setSelectedStandIds(new Set([data.id]));
      setDirty(true);
      
      auditLog({
        event_id: eventId,
        floorplan_id: floorplan.id,
        action: 'stand.create',
        entity_type: 'stand',
        entity_id: data.id,
        diff: { label: newLabel, status: newStatus, width, height },
      });
    }
  }, [floorplan, eventId, canEdit, stands, activeExhibitorId, toast, auditLog]);

  const deleteStand = useCallback(async () => {
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

    setStands(prev => prev.filter((s) => !selectedStandIds.has(s.id)));
    setSelectedStandIds(new Set());
    setDirty(true);
  }, [selectedStandIds, canEdit, eventId, stands, selectedFloorplanId, auditLog]);

  const saveAll = useCallback(async () => {
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
  }, [canEdit, eventId, stands, toast]);

  // Bulk actions
  const handleBulkSetStatus = useCallback((status: StandStatus) => {
    if (!eventId) return;
    selectedStandIds.forEach(id => updateStand(id, { status }));
    auditLog({
      event_id: eventId,
      floorplan_id: selectedFloorplanId || undefined,
      action: 'stand.bulk_update',
      entity_type: 'stand',
      diff: { status, count: selectedStandIds.size },
    });
  }, [eventId, selectedStandIds, selectedFloorplanId, updateStand, auditLog]);

  const handleBulkSnapToGrid = useCallback(() => {
    if (!floorplan) return;
    selectedStandIds.forEach(id => {
      const stand = stands.find(s => s.id === id);
      if (stand) {
        const gridSize = floorplan.grid_size;
        updateStand(id, {
          x: Math.round(stand.x / gridSize) * gridSize,
          y: Math.round(stand.y / gridSize) * gridSize,
          width: Math.round(stand.width / gridSize) * gridSize,
          height: Math.round(stand.height / gridSize) * gridSize,
        });
      }
    });
  }, [floorplan, selectedStandIds, stands, updateStand]);

  const handleBulkClearExhibitor = useCallback(() => {
    selectedStandIds.forEach(id => {
      updateStandWithAutoStatus(id, { exhibitor_id: null });
    });
  }, [selectedStandIds, updateStandWithAutoStatus]);

  const handleBulkRotate = useCallback((degrees: number) => {
    selectedStandIds.forEach(id => {
      const stand = stands.find(s => s.id === id);
      if (stand) {
        updateStand(id, { rotation: (stand.rotation + degrees + 360) % 360 });
      }
    });
  }, [selectedStandIds, stands, updateStand]);

  const handleExportLabels = useCallback(() => {
    const selectedStands = stands.filter(s => selectedStandIds.has(s.id));
    const csv = ['Label,X,Y,Width,Height,Rotation,Status,Exhibitor,Hall'];
    selectedStands.forEach(s => {
      const exhibitorName = exhibitors.find(e => e.id === s.exhibitor_id)?.name || '';
      csv.push(`${s.label},${s.x},${s.y},${s.width},${s.height},${s.rotation},${s.status},"${exhibitorName}","${floorplan?.name || ''}"`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stands-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }, [stands, selectedStandIds, exhibitors, floorplan]);

  const handleApplyLabels = useCallback((config: LabelingConfigEnhanced): LabelingResult => {
    if (!eventId) return { assigned: 0, skipped: 0, duplicatesResolved: 0 };
    
    const targetStands = config.applyToSelected 
      ? stands.filter(s => selectedStandIds.has(s.id))
      : [...stands];
    
    targetStands.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 20) return a.x - b.x;
      return a.y - b.y;
    });

    const existingLabels = new Set(stands.map(s => s.label));
    let assigned = 0;
    let skipped = 0;
    let duplicatesResolved = 0;

    targetStands.forEach((stand, index) => {
      let num = config.startNumber + index;
      let label = config.mode === 'prefix' 
        ? `${config.prefix}${num.toString().padStart(config.padding, '0')}`
        : num.toString().padStart(config.padding, '0');

      if (config.skipDuplicates && existingLabels.has(label)) {
        while (existingLabels.has(label)) {
          num++;
          label = config.mode === 'prefix' 
            ? `${config.prefix}${num.toString().padStart(config.padding, '0')}`
            : num.toString().padStart(config.padding, '0');
          duplicatesResolved++;
        }
      }

      if (!existingLabels.has(label) || !config.skipDuplicates) {
        updateStand(stand.id, { label });
        existingLabels.add(label);
        assigned++;
      } else {
        skipped++;
      }
    });

    setDirty(true);
    
    auditLog({
      event_id: eventId,
      floorplan_id: selectedFloorplanId || undefined,
      action: 'stand.labels_generated',
      entity_type: 'stand',
      diff: { prefix: config.prefix, count: assigned, mode: config.mode },
    });

    return { assigned, skipped, duplicatesResolved };
  }, [eventId, stands, selectedStandIds, selectedFloorplanId, updateStand, auditLog]);

  const handleFixDuplicates = useCallback(() => {
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
    toast({ title: 'Duplicaten opgelost', description: `${updates.length} labels aangepast` });
  }, [stands, updateStand, toast]);

  const handleClampToBounds = useCallback(() => {
    if (!floorplan) return;
    let fixed = 0;
    stands.forEach(stand => {
      const clampedX = Math.max(0, Math.min(stand.x, floorplan.width - stand.width));
      const clampedY = Math.max(0, Math.min(stand.y, floorplan.height - stand.height));
      if (clampedX !== stand.x || clampedY !== stand.y) {
        updateStand(stand.id, { x: clampedX, y: clampedY });
        fixed++;
      }
    });
    setDirty(true);
    toast({ title: 'Posities gecorrigeerd', description: `${fixed} stands verplaatst` });
  }, [floorplan, stands, updateStand, toast]);

  const handleBackgroundChange = useCallback((url: string | null, opacity: number) => {
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
  }, [selectedFloorplanId, eventId, auditLog]);

  const handleFloorplanAdded = useCallback((newFloorplan: Floorplan) => {
    setFloorplans((prev) => [...prev, newFloorplan]);
    setSelectedFloorplanId(newFloorplan.id);
  }, []);

  return {
    // State
    loading,
    saving,
    dirty,
    floorplans,
    selectedFloorplanId,
    stands,
    exhibitors,
    exhibitorServices,
    selectedStandIds,
    activeExhibitorId,
    exhibitorSearch,
    eventName,
    statusFilters,
    
    // Computed
    floorplan,
    selectedStand,
    warnings,
    statusCounts,
    filteredExhibitors,
    filteredStands,
    
    // Setters
    setSelectedFloorplanId,
    setSelectedStandIds,
    setActiveExhibitorId,
    setExhibitorSearch,
    setStatusFilters,
    setDirty,
    setStands,
    
    // Actions
    fetchData,
    fetchStands,
    getExhibitorName,
    addStand,
    addStandWithSize,
    updateStand,
    updateStandWithAutoStatus,
    deleteStand,
    saveAll,
    handleBulkSetStatus,
    handleBulkSnapToGrid,
    handleBulkClearExhibitor,
    handleBulkRotate,
    handleExportLabels,
    handleApplyLabels,
    handleFixDuplicates,
    handleClampToBounds,
    handleBackgroundChange,
    handleFloorplanAdded,
  };
}
