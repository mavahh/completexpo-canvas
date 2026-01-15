// POS System Types

export type VatRate = 'VAT_0' | 'VAT_6' | 'VAT_12' | 'VAT_21';
export type PaymentMethod = 'CASH' | 'CARD' | 'OTHER';
export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'REFUNDED';
export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface PosCategory {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PosProduct {
  id: string;
  event_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  price_cents: number;
  vat_rate: VatRate;
  active: boolean;
  created_at: string;
  updated_at: string;
  category?: PosCategory;
}

export interface PosRegister {
  id: string;
  event_id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PosShift {
  id: string;
  event_id: string;
  register_id: string;
  opened_by_user_id: string;
  opened_at: string;
  opening_cash_cents: number;
  closed_by_user_id: string | null;
  closed_at: string | null;
  closing_cash_cents: number | null;
  expected_cash_cents: number | null;
  status: ShiftStatus;
  created_at: string;
  updated_at: string;
  register?: PosRegister;
  opened_by?: { name: string; email: string };
  closed_by?: { name: string; email: string };
}

export interface PosSale {
  id: string;
  event_id: string;
  register_id: string;
  shift_id: string;
  sold_by_user_id: string;
  receipt_number: string | null;
  status: SaleStatus;
  payment_method: PaymentMethod;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  cash_received_cents: number | null;
  change_given_cents: number | null;
  note: string | null;
  created_at: string;
  items?: PosSaleItem[];
  sold_by?: { name: string; email: string };
}

export interface PosSaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  name_snapshot: string;
  price_cents_snapshot: number;
  vat_rate_snapshot: VatRate;
  qty: number;
  line_total_cents: number;
}

// Cart types for POS sell screen
export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  vatRate: VatRate;
  qty: number;
}

// VAT rate percentages
export const VAT_RATES: Record<VatRate, number> = {
  VAT_0: 0,
  VAT_6: 6,
  VAT_12: 12,
  VAT_21: 21,
};

export const VAT_RATE_LABELS: Record<VatRate, string> = {
  VAT_0: '0%',
  VAT_6: '6%',
  VAT_12: '12%',
  VAT_21: '21%',
};

// Helper to format cents to currency string
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

// Helper to calculate VAT from price (VAT included)
export function calculateVatFromInclusive(priceCents: number, vatRate: VatRate): number {
  const rate = VAT_RATES[vatRate];
  if (rate === 0) return 0;
  return Math.round(priceCents - (priceCents / (1 + rate / 100)));
}

// Helper to calculate line totals
export function calculateCartTotals(items: CartItem[]): {
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  vatBreakdown: Record<VatRate, { base: number; vat: number }>;
} {
  let subtotalCents = 0;
  let vatCents = 0;
  const vatBreakdown: Record<VatRate, { base: number; vat: number }> = {
    VAT_0: { base: 0, vat: 0 },
    VAT_6: { base: 0, vat: 0 },
    VAT_12: { base: 0, vat: 0 },
    VAT_21: { base: 0, vat: 0 },
  };

  for (const item of items) {
    const lineTotalCents = item.priceCents * item.qty;
    const lineVat = calculateVatFromInclusive(lineTotalCents, item.vatRate);
    const lineBase = lineTotalCents - lineVat;

    subtotalCents += lineTotalCents;
    vatCents += lineVat;
    vatBreakdown[item.vatRate].base += lineBase;
    vatBreakdown[item.vatRate].vat += lineVat;
  }

  return {
    subtotalCents,
    vatCents,
    totalCents: subtotalCents, // Price is VAT inclusive
    vatBreakdown,
  };
}
