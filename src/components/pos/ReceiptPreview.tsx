import { useRef } from 'react';
import { Printer, Download, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCents, VAT_RATE_LABELS, calculateVatFromInclusive } from '@/types/pos';
import type { PosSale, VatRate } from '@/types/pos';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ReceiptPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: PosSale;
  registerName: string;
  onNewSale: () => void;
}

export function ReceiptPreview({
  open,
  onOpenChange,
  sale,
  registerName,
  onNewSale,
}: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bon ${sale.receipt_number}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              max-width: 300px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 16px; margin: 0; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; }
            .item { margin: 5px 0; }
            .total { font-weight: bold; font-size: 14px; }
            .vat-summary { font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          ${receiptRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Calculate VAT breakdown
  const vatBreakdown: Record<VatRate, { base: number; vat: number }> = {
    VAT_0: { base: 0, vat: 0 },
    VAT_6: { base: 0, vat: 0 },
    VAT_12: { base: 0, vat: 0 },
    VAT_21: { base: 0, vat: 0 },
  };

  sale.items?.forEach(item => {
    const lineTotal = item.line_total_cents;
    const lineVat = calculateVatFromInclusive(lineTotal, item.vat_rate_snapshot);
    vatBreakdown[item.vat_rate_snapshot].base += lineTotal - lineVat;
    vatBreakdown[item.vat_rate_snapshot].vat += lineVat;
  });

  const paymentMethodLabel = {
    CASH: 'Contant',
    CARD: 'Kaart',
    OTHER: 'Overig',
  }[sale.payment_method];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bon</DialogTitle>
        </DialogHeader>

        <div 
          ref={receiptRef}
          className="bg-white text-black p-6 rounded-lg font-mono text-sm"
        >
          <div className="text-center mb-4">
            <h1 className="font-bold text-lg">ComplexExpo POS</h1>
            <p className="text-xs text-gray-600">Kassa: {registerName}</p>
          </div>

          <div className="border-t border-dashed border-gray-400 my-3" />

          <div className="flex justify-between text-xs text-gray-600">
            <span>Bon: {sale.receipt_number}</span>
            <span>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: nl })}</span>
          </div>

          <div className="border-t border-dashed border-gray-400 my-3" />

          <div className="space-y-2">
            {sale.items?.map(item => (
              <div key={item.id} className="flex justify-between">
                <span className="flex-1">
                  {item.qty}x {item.name_snapshot}
                </span>
                <span className="text-right ml-2">
                  {formatCents(item.line_total_cents)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-400 my-3" />

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotaal</span>
              <span>{formatCents(sale.subtotal_cents)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>BTW</span>
              <span>{formatCents(sale.vat_cents)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAAL</span>
              <span>{formatCents(sale.total_cents)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-3" />

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Betaalmethode</span>
              <span>{paymentMethodLabel}</span>
            </div>
            {sale.payment_method === 'CASH' && (
              <>
                <div className="flex justify-between">
                  <span>Ontvangen</span>
                  <span>{formatCents(sale.cash_received_cents || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wisselgeld</span>
                  <span>{formatCents(sale.change_given_cents || 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-3" />

          <div className="text-xs text-gray-600 space-y-0.5">
            <p className="font-semibold">BTW Overzicht:</p>
            {Object.entries(vatBreakdown)
              .filter(([_, v]) => v.vat > 0)
              .map(([rate, v]) => (
                <div key={rate} className="flex justify-between">
                  <span>{VAT_RATE_LABELS[rate as VatRate]}</span>
                  <span>
                    basis {formatCents(v.base)} / BTW {formatCents(v.vat)}
                  </span>
                </div>
              ))}
          </div>

          <div className="text-center mt-4 text-xs text-gray-500">
            Bedankt voor uw aankoop!
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Printen
          </Button>
          <Button onClick={onNewSale} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuwe verkoop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
