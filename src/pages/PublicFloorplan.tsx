import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, Copy, Check, Download, Search, ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';
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
  const canvasRef = useRef<HTMLDivElement>(null);

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
  
  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Filters
  const [statusFilters, setStatusFilters] = useState<Record<StandStatus, boolean>>({
    AVAILABLE: true,
    RESERVED: true,
    SOLD: true,
    BLOCKED: true,
  });

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

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (selectedFloorplanId) {
      fetchStands();
    }
  }, [selectedFloorplanId]);

  const fetchData = async () => {
    if (!token) {
      setError('Geen token opgegeven');
      setLoading(false);
      return;
    }

    try {
      // Fetch public link
      const { data: linkData, error: linkError } = await supabase
        .from('event_public_links')
        .select('*')
        .eq('token', token)
        .eq('enabled', true)
        .single();

      if (linkError || !linkData) {
        setError('Deze link is niet beschikbaar of ongeldig');
        setLoading(false);
        return;
      }

      setPublicLink(linkData);

      // Fetch event
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name, location, start_date, end_date')
        .eq('id', linkData.event_id)
        .single();

      if (eventData) {
        setEvent(eventData);
      }

      // Fetch floorplans
      const { data: floorplanData } = await supabase
        .from('floorplans')
        .select('*')
        .eq('event_id', linkData.event_id)
        .order('name');

      if (floorplanData && floorplanData.length > 0) {
        setFloorplans(floorplanData);
        // Select default or first floorplan
        const defaultId = linkData.default_floorplan_id || floorplanData[0].id;
        setSelectedFloorplanId(defaultId);
      }

      // Fetch exhibitors
      const { data: exhibitorData } = await supabase
        .from('exhibitors')
        .select('id, name, contact_name, email, phone')
        .eq('event_id', linkData.event_id);

      if (exhibitorData) {
        setExhibitors(exhibitorData);

        // Fetch exhibitor services
        const exhibitorIds = exhibitorData.map(e => e.id);
        if (exhibitorIds.length > 0) {
          const { data: servicesData } = await supabase
            .from('exhibitor_services')
            .select('*')
            .in('exhibitor_id', exhibitorIds);

          if (servicesData) {
            setExhibitorServices(servicesData);
          }
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
    if (!selectedFloorplanId) return;

    const { data: standsData } = await supabase
      .from('stands')
      .select('*')
      .eq('floorplan_id', selectedFloorplanId);

    if (standsData) {
      setStands(standsData as Stand[]);
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
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-4 flex-wrap">
        {/* Logo & Event name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-sm sm:text-base">{event?.name}</h1>
            {event?.location && (
              <p className="text-xs text-muted-foreground">{event.location}</p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md">
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
        <div className="flex items-center gap-2 flex-wrap">
          {publicLink?.allow_downloads && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
                disabled={exporting}
              >
                <Download className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">PNG</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exporting}
              >
                <Download className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">PDF</span>
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
          <Badge variant="secondary" className="gap-1">
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline">Publieke weergave</span>
          </Badge>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Halls & Filters */}
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
        <div className="flex-1 overflow-hidden relative">
          {/* Zoom controls */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setZoom(z => Math.min(3, z + 0.2))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Badge variant="secondary">{Math.round(zoom * 100)}%</Badge>
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
          />
        </div>

        {/* Right sidebar - Stand details */}
        <aside className="w-80 border-l border-border bg-card p-4 hidden md:flex flex-col overflow-y-auto">
          <PublicStandDetails
            stand={selectedStand}
            exhibitor={selectedExhibitor}
            services={selectedServices}
          />
        </aside>
      </div>
    </div>
  );
}
