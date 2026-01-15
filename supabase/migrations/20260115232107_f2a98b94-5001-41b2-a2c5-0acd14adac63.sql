-- POS System Tables and Enums

-- Enum for VAT rates
CREATE TYPE public.vat_rate AS ENUM ('VAT_0', 'VAT_6', 'VAT_12', 'VAT_21');

-- Enum for payment methods
CREATE TYPE public.payment_method AS ENUM ('CASH', 'CARD', 'OTHER');

-- Enum for sale status
CREATE TYPE public.sale_status AS ENUM ('COMPLETED', 'VOIDED', 'REFUNDED');

-- Enum for shift status
CREATE TYPE public.shift_status AS ENUM ('OPEN', 'CLOSED');

-- POS Categories table
CREATE TABLE public.pos_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, name)
);

-- POS Products table
CREATE TABLE public.pos_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.pos_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  price_cents INTEGER NOT NULL,
  vat_rate public.vat_rate NOT NULL DEFAULT 'VAT_21',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_products_event ON public.pos_products(event_id);
CREATE INDEX idx_pos_products_category ON public.pos_products(category_id);

-- POS Registers table
CREATE TABLE public.pos_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- POS Shifts table
CREATE TABLE public.pos_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  register_id UUID NOT NULL REFERENCES public.pos_registers(id) ON DELETE CASCADE,
  opened_by_user_id UUID NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opening_cash_cents INTEGER NOT NULL DEFAULT 0,
  closed_by_user_id UUID,
  closed_at TIMESTAMP WITH TIME ZONE,
  closing_cash_cents INTEGER,
  expected_cash_cents INTEGER,
  status public.shift_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_shifts_event ON public.pos_shifts(event_id);
CREATE INDEX idx_pos_shifts_register ON public.pos_shifts(register_id);
CREATE INDEX idx_pos_shifts_status ON public.pos_shifts(status);

-- POS Sales table
CREATE TABLE public.pos_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  register_id UUID NOT NULL REFERENCES public.pos_registers(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.pos_shifts(id) ON DELETE CASCADE,
  sold_by_user_id UUID NOT NULL,
  receipt_number TEXT,
  status public.sale_status NOT NULL DEFAULT 'COMPLETED',
  payment_method public.payment_method NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  vat_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  cash_received_cents INTEGER,
  change_given_cents INTEGER,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, receipt_number)
);

CREATE INDEX idx_pos_sales_event ON public.pos_sales(event_id);
CREATE INDEX idx_pos_sales_shift ON public.pos_sales(shift_id);
CREATE INDEX idx_pos_sales_created ON public.pos_sales(created_at);

-- POS Sale Items table
CREATE TABLE public.pos_sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.pos_products(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_cents_snapshot INTEGER NOT NULL,
  vat_rate_snapshot public.vat_rate NOT NULL,
  qty INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

CREATE INDEX idx_pos_sale_items_sale ON public.pos_sale_items(sale_id);

-- Updated_at triggers
CREATE TRIGGER update_pos_categories_updated_at
  BEFORE UPDATE ON public.pos_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_products_updated_at
  BEFORE UPDATE ON public.pos_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_registers_updated_at
  BEFORE UPDATE ON public.pos_registers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_shifts_updated_at
  BEFORE UPDATE ON public.pos_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all POS tables
ALTER TABLE public.pos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pos_categories
CREATE POLICY "Event members can view categories"
  ON public.pos_categories FOR SELECT
  USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Members with POS_ADMIN can manage categories"
  ON public.pos_categories FOR ALL
  USING (is_event_member(auth.uid(), event_id) AND has_event_permission(auth.uid(), event_id, 'POS_ADMIN'));

-- RLS Policies for pos_products
CREATE POLICY "Event members can view products"
  ON public.pos_products FOR SELECT
  USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Members with POS_ADMIN can manage products"
  ON public.pos_products FOR ALL
  USING (is_event_member(auth.uid(), event_id) AND has_event_permission(auth.uid(), event_id, 'POS_ADMIN'));

-- RLS Policies for pos_registers
CREATE POLICY "Event members can view registers"
  ON public.pos_registers FOR SELECT
  USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Members with POS_ADMIN can manage registers"
  ON public.pos_registers FOR ALL
  USING (is_event_member(auth.uid(), event_id) AND has_event_permission(auth.uid(), event_id, 'POS_ADMIN'));

-- RLS Policies for pos_shifts
CREATE POLICY "Event members can view shifts"
  ON public.pos_shifts FOR SELECT
  USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Members with POS_SHIFT_OPEN can open shifts"
  ON public.pos_shifts FOR INSERT
  WITH CHECK (is_event_member(auth.uid(), event_id) AND has_event_permission(auth.uid(), event_id, 'POS_SHIFT_OPEN'));

CREATE POLICY "Members with POS_SHIFT_OPEN can close shifts"
  ON public.pos_shifts FOR UPDATE
  USING (is_event_member(auth.uid(), event_id) AND has_event_permission(auth.uid(), event_id, 'POS_SHIFT_OPEN'));

-- RLS Policies for pos_sales
CREATE POLICY "Event members can view sales"
  ON public.pos_sales FOR SELECT
  USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Members with POS_SELL can create sales"
  ON public.pos_sales FOR INSERT
  WITH CHECK (is_event_member(auth.uid(), event_id) AND has_event_permission(auth.uid(), event_id, 'POS_SELL'));

CREATE POLICY "Members with POS_ADMIN can manage sales"
  ON public.pos_sales FOR UPDATE
  USING (is_event_member(auth.uid(), event_id) AND has_event_permission(auth.uid(), event_id, 'POS_ADMIN'));

-- RLS Policies for pos_sale_items
CREATE POLICY "Event members can view sale items"
  ON public.pos_sale_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pos_sales s
    WHERE s.id = pos_sale_items.sale_id
    AND is_event_member(auth.uid(), s.event_id)
  ));

CREATE POLICY "Members with POS_SELL can create sale items"
  ON public.pos_sale_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pos_sales s
    WHERE s.id = pos_sale_items.sale_id
    AND is_event_member(auth.uid(), s.event_id)
    AND has_event_permission(auth.uid(), s.event_id, 'POS_SELL')
  ));

-- Add POS permissions to permissions table
INSERT INTO public.permissions (name, description) VALUES
  ('POS_VIEW', 'Kan POS scherm bekijken'),
  ('POS_SELL', 'Kan verkopen via POS'),
  ('POS_SHIFT_OPEN', 'Kan shifts openen en sluiten'),
  ('POS_ADMIN', 'Kan POS producten, categorieën en registers beheren + rapporten bekijken')
ON CONFLICT (name) DO NOTHING;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number(_event_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_prefix TEXT;
  next_seq INTEGER;
BEGIN
  today_prefix := to_char(now(), 'YYYY-MM-DD');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(receipt_number FROM '-(\d+)$') AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM public.pos_sales
  WHERE event_id = _event_id
    AND receipt_number LIKE today_prefix || '-%';
  
  RETURN today_prefix || '-' || LPAD(next_seq::TEXT, 6, '0');
END;
$$;

-- Function to calculate expected cash for a shift
CREATE OR REPLACE FUNCTION public.calculate_shift_expected_cash(_shift_id uuid)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opening_cash INTEGER;
  cash_sales_total INTEGER;
BEGIN
  SELECT s.opening_cash_cents INTO opening_cash
  FROM public.pos_shifts s
  WHERE s.id = _shift_id;
  
  SELECT COALESCE(SUM(
    CASE 
      WHEN sale.status = 'COMPLETED' AND sale.payment_method = 'CASH' THEN sale.total_cents
      WHEN sale.status = 'REFUNDED' AND sale.payment_method = 'CASH' THEN -sale.total_cents
      ELSE 0
    END
  ), 0)
  INTO cash_sales_total
  FROM public.pos_sales sale
  WHERE sale.shift_id = _shift_id;
  
  RETURN opening_cash + cash_sales_total;
END;
$$;