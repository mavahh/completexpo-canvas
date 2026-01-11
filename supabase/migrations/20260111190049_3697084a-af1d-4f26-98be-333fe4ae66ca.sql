-- Add audit_logs table for tracking changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  floorplan_id UUID REFERENCES public.floorplans(id) ON DELETE SET NULL,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  diff JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_event_id ON public.audit_logs(event_id);
CREATE INDEX idx_audit_logs_floorplan_id ON public.audit_logs(floorplan_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs
CREATE POLICY "Members can view audit logs"
ON public.audit_logs FOR SELECT
USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (is_event_member(auth.uid(), event_id));

-- Add floorplan_templates table
CREATE TABLE IF NOT EXISTS public.floorplan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  width INTEGER NOT NULL DEFAULT 1200,
  height INTEGER NOT NULL DEFAULT 800,
  grid_size INTEGER NOT NULL DEFAULT 20,
  background_url TEXT,
  background_opacity INTEGER DEFAULT 100,
  stands_data JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for templates
CREATE INDEX idx_floorplan_templates_account_id ON public.floorplan_templates(account_id);

-- Enable RLS on templates
ALTER TABLE public.floorplan_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Account members can view templates"
ON public.floorplan_templates FOR SELECT
USING (account_id = get_user_account_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Account admins can create templates"
ON public.floorplan_templates FOR INSERT
WITH CHECK (account_id = get_user_account_id(auth.uid()) AND is_account_admin(auth.uid()));

CREATE POLICY "Account admins can update templates"
ON public.floorplan_templates FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()) AND is_account_admin(auth.uid()));

CREATE POLICY "Account admins can delete templates"
ON public.floorplan_templates FOR DELETE
USING (account_id = get_user_account_id(auth.uid()) AND is_account_admin(auth.uid()));

-- Add exhibitor_library table for reusable exhibitor profiles
CREATE TABLE IF NOT EXISTS public.exhibitor_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  vat TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for exhibitor library
CREATE INDEX idx_exhibitor_library_account_id ON public.exhibitor_library(account_id);

-- Enable RLS on exhibitor_library
ALTER TABLE public.exhibitor_library ENABLE ROW LEVEL SECURITY;

-- RLS policies for exhibitor_library
CREATE POLICY "Account members can view library"
ON public.exhibitor_library FOR SELECT
USING (account_id = get_user_account_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Account members can create in library"
ON public.exhibitor_library FOR INSERT
WITH CHECK (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account members can update library"
ON public.exhibitor_library FOR UPDATE
USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account admins can delete from library"
ON public.exhibitor_library FOR DELETE
USING (account_id = get_user_account_id(auth.uid()) AND is_account_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_floorplan_templates_updated_at
  BEFORE UPDATE ON public.floorplan_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exhibitor_library_updated_at
  BEFORE UPDATE ON public.exhibitor_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();