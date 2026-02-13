
-- =============================================
-- VENUE ARCHITECTURE: Regions, Venues, Halls
-- =============================================

-- 1. Regions
CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage regions"
  ON public.regions FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active regions"
  ON public.regions FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Venues
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage venues"
  ON public.venues FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active venues"
  ON public.venues FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Halls
CREATE TABLE public.halls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width_meters NUMERIC NOT NULL DEFAULT 100,
  height_meters NUMERIC NOT NULL DEFAULT 80,
  scale_ratio NUMERIC NOT NULL DEFAULT 1,
  background_url TEXT,
  background_width_meters NUMERIC,
  background_height_meters NUMERIC,
  background_type TEXT, -- 'svg', 'pdf', 'dxf', 'dwg'
  background_needs_conversion BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage halls"
  ON public.halls FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active halls"
  ON public.halls FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE TRIGGER update_halls_updated_at
  BEFORE UPDATE ON public.halls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage bucket for hall backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('hall-backgrounds', 'hall-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Super admins can upload hall backgrounds"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hall-backgrounds' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update hall backgrounds"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'hall-backgrounds' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete hall backgrounds"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'hall-backgrounds' AND is_super_admin(auth.uid()));

CREATE POLICY "Anyone can view hall backgrounds"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hall-backgrounds');

-- 5. Add hall_id to events
ALTER TABLE public.events ADD COLUMN hall_id UUID REFERENCES public.halls(id);

-- 6. Add hall_id to stands (nullable for backwards compatibility)
ALTER TABLE public.stands ADD COLUMN hall_id UUID REFERENCES public.halls(id);

-- 7. Editor layer system
CREATE TABLE public.editor_layers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floorplan_id UUID NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom', -- 'background', 'stands', 'labels', 'technical', 'electrical', 'custom'
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.editor_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can manage layers"
  ON public.editor_layers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.floorplans f
      WHERE f.id = editor_layers.floorplan_id
      AND is_event_member(auth.uid(), f.event_id)
    )
  );

CREATE TRIGGER update_editor_layers_updated_at
  BEFORE UPDATE ON public.editor_layers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
