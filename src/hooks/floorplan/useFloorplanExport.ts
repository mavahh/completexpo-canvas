import { useCallback, RefObject } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDarkMode } from '@/hooks/useDarkMode';
import { jsPDF } from 'jspdf';
import { StandStatus, STAND_STATUS_CONFIG } from '@/components/floorplan/StandLegend';
import { ExportOptionsEnhanced } from '@/components/floorplan/ExportDialogEnhanced';
import type { Floorplan } from '@/types';

interface UseFloorplanExportProps {
  canvasRef: RefObject<HTMLDivElement>;
  floorplan: Floorplan | undefined;
  eventName: string;
  statusCounts: Record<StandStatus, number>;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
}

export function useFloorplanExport({
  canvasRef,
  floorplan,
  eventName,
  statusCounts,
  showGrid,
  setShowGrid,
}: UseFloorplanExportProps) {
  const { toast } = useToast();
  const { isDark } = useDarkMode();

  const handleExport = useCallback(async (options: ExportOptionsEnhanced) => {
    if (!canvasRef.current) return;
    
    try {
      const originalShowGrid = showGrid;
      if (options.hideGrid) {
        setShowGrid(false);
        await new Promise(r => setTimeout(r, 100));
      }

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        scale: options.scale,
      });

      if (options.hideGrid) {
        setShowGrid(originalShowGrid);
      }
      
      const filename = `${eventName}-${floorplan?.name || 'floorplan'}`;
      const date = new Date().toLocaleDateString('nl-NL');

      if (options.format === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height + (options.includeTitle ? 60 : 0) + (options.includeLegend ? 80 : 0)],
        });

        let yOffset = 0;

        if (options.includeTitle) {
          pdf.setFontSize(24);
          pdf.text(`${eventName} - ${floorplan?.name}`, 20, 35);
          pdf.setFontSize(12);
          pdf.text(date, 20, 50);
          yOffset = 60;
        }

        pdf.addImage(imgData, 'PNG', 0, yOffset, canvas.width, canvas.height);

        if (options.includeLegend) {
          const legendY = yOffset + canvas.height + 20;
          pdf.setFontSize(10);
          const statuses: StandStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'];
          statuses.forEach((status, i) => {
            const config = STAND_STATUS_CONFIG[status];
            pdf.setFillColor(config.color);
            pdf.rect(20 + i * 120, legendY, 15, 15, 'F');
            pdf.text(`${config.label} (${statusCounts[status]})`, 40 + i * 120, legendY + 12);
          });
        }

        pdf.save(`${filename}.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      
      toast({ title: 'Geëxporteerd', description: `${options.format.toUpperCase()} gedownload` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ variant: 'destructive', title: 'Export mislukt', description: 'Kon plattegrond niet exporteren' });
    }
  }, [canvasRef, floorplan, eventName, statusCounts, showGrid, setShowGrid, isDark, toast]);

  return { handleExport };
}
