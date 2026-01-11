-- Add background_opacity to floorplans if not exists
ALTER TABLE public.floorplans 
ADD COLUMN IF NOT EXISTS background_opacity integer DEFAULT 100;

-- Create exhibitor_services table for power/water/lights/construction/carpet
CREATE TYPE public.power_option AS ENUM ('NONE', 'WATT_500', 'WATT_2000', 'WATT_3500', 'AMP_16A', 'AMP_32A');
CREATE TYPE public.surface_type AS ENUM ('EMPTY', 'EMPTY_WITH_CARPET', 'WITH_CONSTRUCTION');

CREATE TABLE public.exhibitor_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exhibitor_id UUID NOT NULL REFERENCES public.exhibitors(id) ON DELETE CASCADE,
  water_connections INTEGER NOT NULL DEFAULT 0,
  power_option power_option NOT NULL DEFAULT 'NONE',
  light_points INTEGER NOT NULL DEFAULT 0,
  construction_booked BOOLEAN NOT NULL DEFAULT false,
  carpet_included BOOLEAN NOT NULL DEFAULT false,
  surface_type surface_type NOT NULL DEFAULT 'EMPTY',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exhibitor_id)
);

-- Enable RLS
ALTER TABLE public.exhibitor_services ENABLE ROW LEVEL SECURITY;

-- RLS policies - based on exhibitor's event membership
CREATE POLICY "Members can view exhibitor services"
ON public.exhibitor_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exhibitors e
    WHERE e.id = exhibitor_id
    AND public.is_event_member(auth.uid(), e.event_id)
  )
);

CREATE POLICY "Members can create exhibitor services"
ON public.exhibitor_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exhibitors e
    WHERE e.id = exhibitor_id
    AND public.is_event_member(auth.uid(), e.event_id)
  )
);

CREATE POLICY "Members can update exhibitor services"
ON public.exhibitor_services
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.exhibitors e
    WHERE e.id = exhibitor_id
    AND public.is_event_member(auth.uid(), e.event_id)
  )
);

CREATE POLICY "Members can delete exhibitor services"
ON public.exhibitor_services
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.exhibitors e
    WHERE e.id = exhibitor_id
    AND public.is_event_member(auth.uid(), e.event_id)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_exhibitor_services_updated_at
BEFORE UPDATE ON public.exhibitor_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for floorplan backgrounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'floorplan-backgrounds',
  'floorplan-backgrounds',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for floorplan backgrounds
CREATE POLICY "Anyone can view floorplan backgrounds"
ON storage.objects
FOR SELECT
USING (bucket_id = 'floorplan-backgrounds');

CREATE POLICY "Authenticated users can upload floorplan backgrounds"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'floorplan-backgrounds'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update floorplan backgrounds"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'floorplan-backgrounds'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete floorplan backgrounds"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'floorplan-backgrounds'
  AND auth.uid() IS NOT NULL
);