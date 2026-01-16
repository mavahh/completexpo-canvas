import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, Copy, Check, Download, Search, ZoomIn, ZoomOut, AlertTriangle, Crosshair, RotateCcw, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { STAND_STATUS_CONFIG, StandStatus } from '@/components/floorplan/StandLegend';
import { StandServiceIcons } from '@/components/floorplan/StandServiceIcons';
import { PublicFloorplanCanvas } from '@/components/floorplan/PublicFloorplanCanvas';
import { PublicStandDetails } from '@/components/floorplan/PublicStandDetails';
import { PublicHallSelector } from '@/components/floorplan/PublicHallSelector';
import { PublicStatusFilters } from '@/components/floorplan/PublicStatusFilters';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Stand, Floorplan, ExhibitorServices, ExhibitorContact } from '@/types';
import { jsPDF } from 'jspdf';

interface PublicLinkData {
  id: string;
  event_id: string;
  token: string;
  enabled: boolean;
  allow_downloads: boolean;
  default_floorplan_id: string | null;
}

interface EventData {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
}

export default function PublicFloorplan() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicLink, setPublicLink] = useState<PublicLinkData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [selectedFloorplanId, setSelectedFloorplanId] = useState<string | null>(null);
  const [stands, setStands] = useState<Stand[]>([]);
  const [exhibitors, setExhibitors] = useState<ExhibitorContact[]>([]);
  const [exhibitorServices, setExhibitorServices] = useState<ExhibitorServices[]>([]);
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasFitted, setHasFitted] = useState(false);
  
  // Canvas state - start with reasonable initial pan to show content
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Touch gesture state
  const touchStateRef = useRef<{
    lastTouchDistance: number | null;
    lastTouchCenter: { x: number; y: number } | null;
    initialZoom: number;
    initialPan: { x: number; y: number };
  }>({
    lastTouchDistance: null,
    lastTouchCenter: null,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
  });
  
  // Filters
  const [statusFilters, setStatusFilters] = useState<Record<StandStatus, boolean>>({
    AVAILABLE: true,
    RESERVED: true,
    SOLD: true,
    BLOCKED: true,
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  // Computed
  const floorplan = floorplans.find(f => f.id === selectedFloorplanId);
  const selectedStand = stands.find(s => s.id === selectedStandId) || null;
  const selectedExhibitor = selectedStand?.exhibitor_id 
    ? exhibitors.find(e => e.id === selectedStand.exhibitor_id) 
    : null;
  const selectedServices = selectedStand?.exhibitor_id
    ? exhibitorServices.find(s => s.exhibitor_id === selectedStand.exhibitor_id)
    : null;

  const filteredStands = stands.filter(s => {
    if (!statusFilters[s.status]) return false;
    if (searchQuery) {
      const exhibitor = exhibitors.find(e => e.id === s.exhibitor_id);
      const searchLower = searchQuery.toLowerCase();
      return (
        s.label.toLowerCase().includes(searchLower) ||
        (exhibitor?.name || '').toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const statusCounts = stands.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<StandStatus, number>);

  const getExhibitorName = useCallback((id: string | null) => {
    if (!id) return null;
    return exhibitors.find(e => e.id === id)?.name || null;
  }, [exhibitors]);

  // Fit to screen function
  const fitToScreen = useCallback(() => {
    if (!floorplan || !canvasContainerRef.current) return;
    
    const container = canvasContainerRef.current;
    const padding = 40;
    const containerWidth = container.clientWidth - padding;
    const containerHeight = container.clientHeight - padding;
    
    if (containerWidth <= 0 || containerHeight <= 0) return;
    
    const scaleX = containerWidth / floorplan.width;
    const scaleY = containerHeight / floorplan.height;
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    
    setZoom(newZoom);
    setPan({
      x: (containerWidth - floorplan.width * newZoom) / 2 + padding / 2,
      y: (containerHeight - floorplan.height * newZoom) / 2 + padding / 2,
    });
  }, [floorplan]);

  // Reset zoom to 100% and center
  const resetZoom = useCallback(() => {
    if (!floorplan || !canvasContainerRef.current) return;
    
    const container = canvasContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    setZoom(1);
    setPan({
      x: (containerWidth - floorplan.width) / 2,
      y: (containerHeight - floorplan.height) / 2,
    });
  }, [floorplan]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (selectedFloorplanId) {
      fetchStands();
      setHasFitted(false); // Reset fit state when switching floorplans
    }
  }, [selectedFloorplanId]);

  // Auto-fit when floorplan and stands are loaded
  useEffect(() => {
    if (floorplan && stands.length >= 0 && !hasFitted && !loading) {
      const timer = setTimeout(() => {
        fitToScreen();
        setHasFitted(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [floorplan, stands.length, hasFitted, loading, fitToScreen]);

  const fetchData = async () => {
    if (!token) {
      setError('Geen token opgegeven');
      setLoading(false);
      return;
    }

    try {
      // Fetch public link via RPC (bypasses RLS safely)
      const { data: linkData, error: linkError } = await supabase
        .rpc('get_public_link_by_token', { _token: token });

      if (linkError || !linkData || linkData.length === 0) {
        setError('Deze link is niet beschikbaar of ongeldig');
        setLoading(false);
        return;
      }

      const link = linkData[0] as PublicLinkData;
      setPublicLink(link);

      // Fetch event via RPC
      const { data: eventData } = await supabase
        .rpc('get_public_event_by_token', { _token: token });

      if (eventData && eventData.length > 0) {
        setEvent(eventData[0] as EventData);
      }

      // Fetch floorplans via RPC
      const { data: floorplanData } = await supabase
        .rpc('get_public_floorplans_by_token', { _token: token });

      if (floorplanData && floorplanData.length > 0) {
        setFloorplans(floorplanData as Floorplan[]);
        // Select default or first floorplan
        const defaultId = link.default_floorplan_id || floorplanData[0].id;
        setSelectedFloorplanId(defaultId);
      }

      // Fetch exhibitors via RPC (only id and name for public view)
      const { data: exhibitorData } = await supabase
        .rpc('get_public_exhibitors_by_token', { _token: token });

      if (exhibitorData) {
        // Map to ExhibitorContact shape with nulls for private fields
        setExhibitors(exhibitorData.map((e: { id: string; name: string }) => ({
          id: e.id,
          name: e.name,
          contact_name: null,
          email: null,
          phone: null,
        })));

        // Fetch exhibitor services via RPC
        const { data: servicesData } = await supabase
          .rpc('get_public_exhibitor_services_by_token', { _token: token });

        if (servicesData) {
          setExhibitorServices(servicesData as ExhibitorServices[]);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching public floorplan:', err);
      setError('Er is een fout opgetreden bij het laden');
      setLoading(false);
    }
  };

  const fetchStands = async () => {
    if (!selectedFloorplanId || !token) return;

    // Fetch stands via RPC (bypasses RLS safely)
    const { data: standsData, error: standsError } = await supabase
      .rpc('get_public_stands_by_token', { 
        _token: token, 
        _floorplan_id: selectedFloorplanId 
      });

    console.log('Fetched stands:', standsData?.length, standsError);

    if (standsData) {
      // Ensure status is uppercase to match StandStatus type
      const normalizedStands = standsData.map((s: any) => ({
        ...s,
        status: (s.status as string).toUpperCase() as StandStatus,
      }));
      setStands(normalizedStands as Stand[]);
    }
  };

  // Handlers
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link gekopieerd', description: 'Link is gekopieerd naar klembord' });
  };

  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `${event?.name || 'floorplan'}-${floorplan?.name || 'plan'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({ title: 'Geëxporteerd', description: 'PNG gedownload' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ variant: 'destructive', title: 'Export mislukt' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    setExporting(true);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height + 100],
      });

      // Title
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`${event?.name || 'Event'} - ${floorplan?.name || 'Floorplan'}`, 20, 40);
      
      // Add image
      pdf.addImage(imgData, 'PNG', 0, 60, canvas.width, canvas.height);

      // Legend
      const legendY = canvas.height + 70;
      pdf.setFontSize(10);
      const statuses: StandStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'];
      statuses.forEach((status, i) => {
        const config = STAND_STATUS_CONFIG[status];
        pdf.setFillColor(config.color);
        pdf.rect(20 + i * 140, legendY, 15, 15, 'F');
        pdf.text(`${config.label} (${statusCounts[status] || 0})`, 40 + i * 140, legendY + 12);
      });

      pdf.save(`${event?.name || 'floorplan'}-${floorplan?.name || 'plan'}.pdf`);
      toast({ title: 'Geëxporteerd', description: 'PDF gedownload' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ variant: 'destructive', title: 'Export mislukt' });
    } finally {
      setExporting(false);
    }
  };

  const handleStandClick = (standId: string) => {
    setSelectedStandId(standId === selectedStandId ? null : standId);
    // Open mobile details drawer when a stand is clicked
    if (isMobile && standId !== selectedStandId) {
      setMobileDetailsOpen(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch event handlers for pinch-to-zoom
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - panning
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
      touchStateRef.current.lastTouchDistance = null;
      touchStateRef.current.lastTouchCenter = null;
    } else if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      touchStateRef.current.lastTouchDistance = distance;
      touchStateRef.current.lastTouchCenter = center;
      touchStateRef.current.initialZoom = zoom;
      touchStateRef.current.initialPan = { ...pan };
      setIsPanning(false);
    }
  }, [pan, zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning && touchStateRef.current.lastTouchDistance === null) {
      // Single touch panning
      setPan({ 
        x: e.touches[0].clientX - panStart.x, 
        y: e.touches[0].clientY - panStart.y 
      });
    } else if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      const { lastTouchDistance, lastTouchCenter, initialZoom, initialPan } = touchStateRef.current;

      if (lastTouchDistance && currentDistance && lastTouchCenter) {
        const scale = currentDistance / lastTouchDistance;
        const newZoom = Math.max(0.2, Math.min(3, initialZoom * scale));
        
        // Adjust pan to keep the pinch center stationary
        const zoomRatio = newZoom / zoom;
        const centerDeltaX = currentCenter.x - lastTouchCenter.x;
        const centerDeltaY = currentCenter.y - lastTouchCenter.y;
        
        setZoom(newZoom);
        setPan({
          x: pan.x * zoomRatio + centerDeltaX,
          y: pan.y * zoomRatio + centerDeltaY,
        });
      }
    }
  }, [isPanning, panStart, zoom, pan]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      touchStateRef.current.lastTouchDistance = null;
      touchStateRef.current.lastTouchCenter = null;
    } else if (e.touches.length === 1) {
      // Switched from pinch to single touch
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
      touchStateRef.current.lastTouchDistance = null;
      touchStateRef.current.lastTouchCenter = null;
    }
  }, [pan]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Plattegrond laden...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Niet beschikbaar</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
        {/* Logo & Event name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-xs sm:text-sm">C</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground text-sm sm:text-base truncate">{event?.name}</h1>
            {event?.location && (
              <p className="text-xs text-muted-foreground truncate">{event.location}</p>
            )}
          </div>
        </div>

        {/* Search - hidden on mobile, shown in filter sheet */}
        <div className="flex-1 min-w-[200px] max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoek stands, exposanten..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-border"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap ml-auto">
          {/* Mobile filter button */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Filters</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-4">
                {/* Mobile search */}
                <div className="relative sm:hidden">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek stands, exposanten..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-muted/50 border-border"
                  />
                </div>
                
                {/* Hall selector */}
                {floorplans.length > 1 && (
                  <PublicHallSelector
                    floorplans={floorplans}
                    selectedFloorplanId={selectedFloorplanId}
                    stands={stands}
                    statusCounts={statusCounts}
                    onSelect={(id) => {
                      setSelectedFloorplanId(id);
                      setMobileFiltersOpen(false);
                    }}
                  />
                )}

                {/* Status filters */}
                <PublicStatusFilters
                  filters={statusFilters}
                  counts={statusCounts}
                  onChange={(status, checked) => setStatusFilters(prev => ({ ...prev, [status]: checked }))}
                />
              </div>
            </SheetContent>
          </Sheet>

          {publicLink?.allow_downloads && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
                disabled={exporting}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">PNG</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exporting}
                className="hidden sm:flex"
              >
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline ml-1">Link</span>
          </Button>
          <Badge variant="secondary" className="gap-1 hidden sm:flex">
            <Lock className="w-3 h-3" />
            Publieke weergave
          </Badge>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left sidebar - Halls & Filters (desktop only) */}
        <aside className="w-64 border-r border-border bg-card p-4 hidden lg:flex flex-col gap-4 overflow-y-auto">
          {/* Hall selector */}
          {floorplans.length > 1 && (
            <PublicHallSelector
              floorplans={floorplans}
              selectedFloorplanId={selectedFloorplanId}
              stands={stands}
              statusCounts={statusCounts}
              onSelect={setSelectedFloorplanId}
            />
          )}

          {/* Status filters */}
          <PublicStatusFilters
            filters={statusFilters}
            counts={statusCounts}
            onChange={(status, checked) => setStatusFilters(prev => ({ ...prev, [status]: checked }))}
          />
        </aside>

        {/* Canvas */}
        <div ref={canvasContainerRef} className="flex-1 overflow-hidden relative">
          {/* Zoom controls */}
          <div className="absolute top-4 left-4 z-10 flex gap-1 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Inzoomen</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Uitzoomen</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  onClick={fitToScreen}
                >
                  <Crosshair className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Passend maken</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-8 h-8 sm:w-10 sm:h-10 hidden sm:flex"
                  onClick={resetZoom}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset naar 100%</TooltipContent>
            </Tooltip>
            <Badge variant="secondary" className="hidden sm:flex">{Math.round(zoom * 100)}%</Badge>
          </div>

          <PublicFloorplanCanvas
            ref={canvasRef}
            floorplan={floorplan}
            stands={filteredStands}
            selectedStandId={selectedStandId}
            exhibitorServices={exhibitorServices}
            zoom={zoom}
            pan={pan}
            isPanning={isPanning}
            getExhibitorName={getExhibitorName}
            onStandClick={handleStandClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {/* Mobile: Selected stand indicator */}
          {isMobile && selectedStand && !mobileDetailsOpen && (
            <Button
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 shadow-lg"
              onClick={() => setMobileDetailsOpen(true)}
            >
              Stand {selectedStand.label} bekijken
            </Button>
          )}
        </div>

        {/* Right sidebar - Stand details (desktop/tablet only) */}
        <aside className="w-80 border-l border-border bg-card p-4 hidden md:flex flex-col overflow-y-auto">
          <PublicStandDetails
            stand={selectedStand}
            exhibitor={selectedExhibitor}
            services={selectedServices}
          />
        </aside>
      </div>

      {/* Mobile: Bottom drawer for stand details */}
      <Drawer open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <DrawerTitle>
                {selectedStand ? `Stand ${selectedStand.label}` : 'Stand details'}
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">
            <PublicStandDetails
              stand={selectedStand}
              exhibitor={selectedExhibitor}
              services={selectedServices}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
