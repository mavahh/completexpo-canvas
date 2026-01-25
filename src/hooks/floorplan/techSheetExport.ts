import { jsPDF } from 'jspdf';
import type { Stand, ExhibitorMinimal, ExhibitorServices, Floorplan } from '@/types';

interface TechSheetData {
  stands: Stand[];
  exhibitors: ExhibitorMinimal[];
  exhibitorServices: ExhibitorServices[];
  floorplan: Floorplan;
  eventName: string;
}

interface PowerTotals {
  [key: string]: number;
}

/**
 * Generate Tech Sheet CSV
 */
export function generateTechSheetCSV(data: TechSheetData): string {
  const { stands, exhibitors, exhibitorServices, floorplan } = data;
  
  const getExhibitorName = (id: string | null) => {
    if (!id) return '';
    return exhibitors.find(e => e.id === id)?.name || '';
  };

  const getServices = (exhibitorId: string | null) => {
    if (!exhibitorId) return null;
    return exhibitorServices.find(s => s.exhibitor_id === exhibitorId);
  };

  const headers = [
    'Label',
    'Hall',
    'Status',
    'Exhibitor',
    'Width',
    'Height',
    'Area (m²)',
    'Power Option',
    'Water Connections',
    'Light Points',
    'Carpet',
    'Construction',
    'Surface Type',
    'Notes'
  ];

  const rows = stands.map(stand => {
    const exhibitorName = getExhibitorName(stand.exhibitor_id);
    const services = getServices(stand.exhibitor_id);
    const area = ((stand.width / 20) * (stand.height / 20)).toFixed(1);

    return [
      stand.label,
      floorplan.name || '',
      stand.status,
      exhibitorName,
      (stand.width / 20).toFixed(1),
      (stand.height / 20).toFixed(1),
      area,
      services?.power_option || 'NONE',
      services?.water_connections?.toString() || '0',
      services?.light_points?.toString() || '0',
      services?.carpet_included ? 'Yes' : 'No',
      services?.construction_booked ? 'Yes' : 'No',
      services?.surface_type || 'EMPTY',
      stand.notes || ''
    ].map(val => `"${val}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate Tech Sheet PDF Summary
 */
export function generateTechSheetPDF(data: TechSheetData): void {
  const { stands, exhibitors, exhibitorServices, floorplan, eventName } = data;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 20;
  let y = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Tech Sheet: ${eventName}`, margin, y);
  y += 10;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Hall: ${floorplan.name}`, margin, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleDateString('nl-NL')} ${new Date().toLocaleTimeString('nl-NL')}`, margin, y);
  y += 15;

  // Summary stats
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', margin, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  // Status counts
  const statusCounts = {
    AVAILABLE: stands.filter(s => s.status === 'AVAILABLE').length,
    RESERVED: stands.filter(s => s.status === 'RESERVED').length,
    SOLD: stands.filter(s => s.status === 'SOLD').length,
    BLOCKED: stands.filter(s => s.status === 'BLOCKED').length,
  };

  pdf.text(`Total Stands: ${stands.length}`, margin, y);
  y += 5;
  pdf.text(`Available: ${statusCounts.AVAILABLE} | Reserved: ${statusCounts.RESERVED} | Sold: ${statusCounts.SOLD} | Blocked: ${statusCounts.BLOCKED}`, margin, y);
  y += 10;

  // Total area
  const totalArea = stands.reduce((sum, s) => sum + (s.width / 20) * (s.height / 20), 0);
  pdf.text(`Total Stand Area: ${totalArea.toFixed(1)} m²`, margin, y);
  y += 10;

  // Power totals
  pdf.setFont('helvetica', 'bold');
  pdf.text('Power Requirements', margin, y);
  y += 6;
  pdf.setFont('helvetica', 'normal');

  const powerTotals: PowerTotals = {};
  exhibitorServices.forEach(s => {
    const option = s.power_option || 'NONE';
    powerTotals[option] = (powerTotals[option] || 0) + 1;
  });

  Object.entries(powerTotals).forEach(([option, count]) => {
    const label = option.replace('_', ' ');
    pdf.text(`${label}: ${count} stands`, margin + 5, y);
    y += 5;
  });
  y += 5;

  // Water & Light totals
  const totalWater = exhibitorServices.reduce((sum, s) => sum + (s.water_connections || 0), 0);
  const totalLight = exhibitorServices.reduce((sum, s) => sum + (s.light_points || 0), 0);
  const totalConstruction = exhibitorServices.filter(s => s.construction_booked).length;
  const totalCarpet = exhibitorServices.filter(s => s.carpet_included).length;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Services', margin, y);
  y += 6;
  pdf.setFont('helvetica', 'normal');

  pdf.text(`Water Connections: ${totalWater}`, margin + 5, y);
  y += 5;
  pdf.text(`Light Points: ${totalLight}`, margin + 5, y);
  y += 5;
  pdf.text(`Stands with Construction: ${totalConstruction}`, margin + 5, y);
  y += 5;
  pdf.text(`Stands with Carpet: ${totalCarpet}`, margin + 5, y);
  y += 15;

  // Stand list (abbreviated)
  pdf.setFont('helvetica', 'bold');
  pdf.text('Stand Details', margin, y);
  y += 8;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  // Table header
  const colWidths = [20, 45, 15, 20, 20, 20, 20];
  const cols = ['Label', 'Exhibitor', 'Status', 'Power', 'Water', 'Light', 'Area'];
  
  let x = margin;
  cols.forEach((col, i) => {
    pdf.text(col, x, y);
    x += colWidths[i];
  });
  y += 5;

  pdf.setFont('helvetica', 'normal');

  // Table rows
  stands.forEach(stand => {
    if (y > 270) {
      pdf.addPage();
      y = margin;
    }

    const exhibitorName = exhibitors.find(e => e.id === stand.exhibitor_id)?.name || '-';
    const services = exhibitorServices.find(s => s.exhibitor_id === stand.exhibitor_id);
    const area = ((stand.width / 20) * (stand.height / 20)).toFixed(1);

    x = margin;
    const rowData = [
      stand.label,
      exhibitorName.substring(0, 25),
      stand.status.substring(0, 4),
      services?.power_option?.replace('_', '') || '-',
      services?.water_connections?.toString() || '0',
      services?.light_points?.toString() || '0',
      area,
    ];

    rowData.forEach((cell, i) => {
      pdf.text(cell, x, y);
      x += colWidths[i];
    });
    y += 4;
  });

  pdf.save(`tech-sheet-${floorplan.name}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
