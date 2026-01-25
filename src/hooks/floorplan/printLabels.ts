import type { Stand, ExhibitorMinimal } from '@/types';
import { jsPDF } from 'jspdf';

interface PrintLabelsOptions {
  stands: Stand[];
  exhibitors: ExhibitorMinimal[];
  floorplanName: string;
  eventName: string;
  includeQR?: boolean;
  publicToken?: string;
}

/**
 * Generate printable label sheet as PDF
 */
export function generatePrintLabels(options: PrintLabelsOptions): void {
  const { stands, exhibitors, floorplanName, eventName, includeQR, publicToken } = options;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const labelWidth = 60;
  const labelHeight = 30;
  const cols = 3;
  const rows = 8;
  const gapX = (pageWidth - margin * 2 - cols * labelWidth) / (cols - 1);
  const gapY = (pageHeight - margin * 2 - rows * labelHeight) / (rows - 1);

  const getExhibitorName = (id: string | null) => {
    if (!id) return '';
    return exhibitors.find(e => e.id === id)?.name || '';
  };

  let labelIndex = 0;

  stands.forEach((stand) => {
    const page = Math.floor(labelIndex / (cols * rows));
    const positionOnPage = labelIndex % (cols * rows);
    const col = positionOnPage % cols;
    const row = Math.floor(positionOnPage / cols);

    if (page >= pdf.getNumberOfPages()) {
      if (page > 0) pdf.addPage();
    }
    pdf.setPage(page + 1);

    const x = margin + col * (labelWidth + gapX);
    const y = margin + row * (labelHeight + gapY);

    // Label border
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, labelWidth, labelHeight);

    // Stand label (large)
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stand.label, x + 3, y + 10);

    // Exhibitor name
    const exhibitorName = getExhibitorName(stand.exhibitor_id);
    if (exhibitorName) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const truncatedName = exhibitorName.length > 28 
        ? exhibitorName.substring(0, 25) + '...' 
        : exhibitorName;
      pdf.text(truncatedName, x + 3, y + 17);
    }

    // Hall/Event info
    pdf.setFontSize(7);
    pdf.setTextColor(100);
    pdf.text(`${eventName} - ${floorplanName}`, x + 3, y + 23);
    pdf.setTextColor(0);

    // Status indicator
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const statusX = x + labelWidth - 3;
    pdf.text(stand.status.substring(0, 3), statusX, y + 10, { align: 'right' });

    labelIndex++;
  });

  // Header on first page
  pdf.setPage(1);
  
  pdf.save(`labels-${floorplanName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generate printable HTML labels (for browser print)
 */
export function generatePrintLabelsHTML(options: PrintLabelsOptions): string {
  const { stands, exhibitors, floorplanName, eventName } = options;

  const getExhibitorName = (id: string | null) => {
    if (!id) return '';
    return exhibitors.find(e => e.id === id)?.name || '';
  };

  const labels = stands.map(stand => {
    const exhibitorName = getExhibitorName(stand.exhibitor_id);
    return `
      <div class="label">
        <div class="stand-label">${stand.label}</div>
        ${exhibitorName ? `<div class="exhibitor">${exhibitorName}</div>` : ''}
        <div class="event-info">${eventName} - ${floorplanName}</div>
        <div class="status status-${stand.status.toLowerCase()}">${stand.status}</div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Labels - ${eventName} - ${floorplanName}</title>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .labels-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5mm;
        }
        .label {
          border: 1px solid #ccc;
          padding: 3mm;
          height: 28mm;
          box-sizing: border-box;
          position: relative;
          page-break-inside: avoid;
        }
        .stand-label {
          font-size: 18pt;
          font-weight: bold;
        }
        .exhibitor {
          font-size: 9pt;
          margin-top: 2mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .event-info {
          font-size: 7pt;
          color: #666;
          margin-top: 2mm;
        }
        .status {
          position: absolute;
          top: 3mm;
          right: 3mm;
          font-size: 7pt;
          font-weight: bold;
          padding: 1mm 2mm;
          border-radius: 2mm;
        }
        .status-available { background: #22c55e; color: white; }
        .status-reserved { background: #f59e0b; color: white; }
        .status-sold { background: #3b82f6; color: white; }
        .status-blocked { background: #6b7280; color: white; }
      </style>
    </head>
    <body>
      <div class="labels-container">
        ${labels}
      </div>
    </body>
    </html>
  `;
}
