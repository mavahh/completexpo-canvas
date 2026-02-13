/**
 * FloorplanEditorApp – standalone fullscreen editor for a specific event + hall.
 * Route: /floorplan/event/:eventId/hall/:hallId
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Layers, ZoomIn, ZoomOut, Maximize, Crosshair } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useEditorCamera, useBasemapLoader } from '@/hooks/floorplan-editor';
import { BasemapRenderer, LayerPanel, StatusBar } from '@/components/floorplan-editor';
import { screenToWorld } from '@/lib/camera';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { BasemapLayer, BBox } from '@/types/floorplan-editor';

// Dev mode: bypass auth when VITE_DEV_MODE=true
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

interface HallOption {
  id: string;
  name: string;
}

export default function FloorplanEditorApp() {
  const { eventId, hallId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);

  // ---- State ----
  const [eventName, setEventName] = useState('');
  const [hallOptions, setHallOptions] = useState<HallOption[]>([]);
  const [selectedHallId, setSelectedHallId] = useState<string | null>(hallId || null);
  const [showLayers, setShowLayers] = useState(true);
  const [layers, setLayers] = useState<BasemapLayer[]>([]);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);

  // ---- Basemap ----
  const { basemap, loading: basemapLoading, error: basemapError } = useBasemapLoader(selectedHallId);

  // ---- Camera ----
  const { camera, fit, zoomIn, zoomOut, zoomPercent, pointerHandlers, spacePressed } = useEditorCamera({
    containerRef,
    initialBBox: basemap?.bbox,
  });

  // Sync layers from basemap
  useEffect(() => {
    if (basemap?.layers) setLayers(basemap.layers);
  }, [basemap]);

  // Fit when basemap changes
  useEffect(() => {
    if (basemap?.bbox) fit(basemap.bbox);
  }, [basemap?.hallId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Load event info & halls ----
  useEffect(() => {
    if (!eventId) return;
    const loadEvent = async () => {
      const { data: ev } = await supabase
        .from('events')
        .select('name, hall_id')
        .eq('id', eventId)
        .single();

      if (ev) {
        setEventName(ev.name || '');
        // If no hallId in URL, use event's hall_id
        if (!hallId && ev.hall_id) {
          setSelectedHallId(ev.hall_id);
        }

        // Load sibling halls
        if (ev.hall_id) {
          const { data: hall } = await supabase
            .from('halls')
            .select('venue_id')
            .eq('id', ev.hall_id)
            .single();

          if (hall) {
            const { data: halls } = await supabase
              .from('halls')
              .select('id, name')
              .eq('venue_id', hall.venue_id)
              .eq('is_active', true)
              .order('name');

            setHallOptions(halls || []);
          }
        }
      }
    };
    loadEvent();
  }, [eventId, hallId]);

  // ---- Layer toggle ----
  const toggleLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l));
  }, []);

  // ---- Cursor tracking ----
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCursorWorld(screenToWorld(screen, camera));
  }, [camera]);

  // ---- Hall switch ----
  const handleHallSwitch = (newHallId: string) => {
    setSelectedHallId(newHallId);
    // Update URL
    navigate(`/floorplan/event/${eventId}/hall/${newHallId}`, { replace: true });
  };

  // ---- Auth check ----
  if (!DEV_MODE && authLoading) {
    return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!DEV_MODE && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-foreground">Je moet inloggen om de editor te gebruiken.</p>
        <Button onClick={() => navigate('/login')}>Inloggen</Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* ---- Toolbar ---- */}
        <div className="flex items-center justify-between h-10 px-3 border-b border-border bg-card shrink-0">
          {/* Left */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => navigate(`/events/${eventId}`)}>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Terug</span>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{eventName}</span>
          </div>

          {/* Center: Zoom & tools */}
          <div className="flex items-center gap-1">
            {/* Zoom controls */}
            <div className="flex items-center bg-muted rounded-md px-1.5 py-0.5 gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-xs" onClick={zoomOut}>−</Button>
              <span className="text-xs font-mono w-10 text-center">{zoomPercent}%</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-xs" onClick={zoomIn}>+</Button>
            </div>

            {/* Fit to screen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => basemap?.bbox && fit(basemap.bbox)}>
                  <Crosshair className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Fit to screen (0)</p></TooltipContent>
            </Tooltip>

            {/* Layers toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={showLayers ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setShowLayers(!showLayers)}>
                  <Layers className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Lagen</p></TooltipContent>
            </Tooltip>

            {/* Hall switch */}
            {hallOptions.length > 1 && (
              <>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Select value={selectedHallId || ''} onValueChange={handleHallSwitch}>
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <SelectValue placeholder="Hal selecteren..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hallOptions.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => document.documentElement.requestFullscreen?.()}>
                  <Maximize className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Fullscreen</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ---- Canvas viewport ---- */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-muted/30"
          style={{ cursor: spacePressed ? 'grab' : 'default' }}
          onMouseMove={onMouseMove}
          {...pointerHandlers}
        >
          {basemapLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {basemapError && (
            <div className="absolute inset-0 flex items-center justify-center z-20 text-destructive text-sm">
              {basemapError}
            </div>
          )}

          {/* Transformed world container */}
          <div
            className="absolute origin-top-left"
            style={{
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
              willChange: 'transform',
            }}
          >
            {basemap && (
              <div style={{ width: basemap.bbox.maxX - basemap.bbox.minX, height: basemap.bbox.maxY - basemap.bbox.minY, position: 'relative' }}>
                <BasemapRenderer
                  svgUrl={basemap.svgUrl}
                  layers={layers}
                  opacity={100}
                />
              </div>
            )}
          </div>

          {/* Layer panel overlay */}
          {showLayers && layers.length > 0 && (
            <LayerPanel layers={layers} onToggle={toggleLayer} />
          )}
        </div>

        {/* ---- Status bar ---- */}
        <StatusBar
          zoomPercent={zoomPercent}
          units={basemap?.units || 'm'}
          cursorWorld={cursorWorld}
        />
      </div>
    </TooltipProvider>
  );
}
