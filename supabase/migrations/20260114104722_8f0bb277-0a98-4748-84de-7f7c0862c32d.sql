-- Create event_public_links table for public floorplan sharing
CREATE TABLE public.event_public_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  enabled BOOLEAN NOT NULL DEFAULT false,
  allow_downloads BOOLEAN NOT NULL DEFAULT true,
  default_floorplan_id UUID REFERENCES public.floorplans(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_public_links ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read enabled public links by token (for public viewer)
CREATE POLICY "Public links readable by token"
ON public.event_public_links
FOR SELECT
USING (enabled = true);

-- Policy: Event members can manage their event's public links
CREATE POLICY "Event members can manage public links"
ON public.event_public_links
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_members.event_id = event_public_links.event_id
    AND event_members.user_id = auth.uid()
  )
);

-- Policy: System admins can manage all public links
CREATE POLICY "System admins can manage all public links"
ON public.event_public_links
FOR ALL
USING (public.is_system_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_event_public_links_updated_at
BEFORE UPDATE ON public.event_public_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast token lookups
CREATE INDEX idx_event_public_links_token ON public.event_public_links(token);
CREATE INDEX idx_event_public_links_event ON public.event_public_links(event_id);