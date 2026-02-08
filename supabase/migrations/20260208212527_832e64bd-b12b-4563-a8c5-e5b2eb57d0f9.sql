
-- Create email template types enum
CREATE TYPE public.email_template_type AS ENUM (
  'CONFIRMATION',
  'INVITATION', 
  'REMINDER',
  'REJECTION',
  'CUSTOM'
);

-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type public.email_template_type NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, type)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS: users can view templates for events they're members of
CREATE POLICY "Event members can view email templates"
  ON public.email_templates FOR SELECT
  USING (public.is_event_member(auth.uid(), event_id));

-- RLS: event admins can manage templates
CREATE POLICY "Event admins can insert email templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (public.has_event_permission(auth.uid(), event_id, 'SETTINGS_MANAGE'));

CREATE POLICY "Event admins can update email templates"
  ON public.email_templates FOR UPDATE
  USING (public.has_event_permission(auth.uid(), event_id, 'SETTINGS_MANAGE'));

CREATE POLICY "Event admins can delete email templates"
  ON public.email_templates FOR DELETE
  USING (public.has_event_permission(auth.uid(), event_id, 'SETTINGS_MANAGE'));

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
