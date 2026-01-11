
-- =============================================
-- PHASE 2: Users & Roles, Settings, Requests
-- =============================================

-- 1. Create system_role enum
CREATE TYPE public.system_role AS ENUM ('ADMIN', 'MANAGER', 'BUILDER');

-- 2. Create request_status enum
CREATE TYPE public.request_status AS ENUM ('NEW', 'APPROVED', 'REJECTED', 'PROCESSED');

-- 3. Create document_language enum
CREATE TYPE public.document_language AS ENUM ('NL', 'FR', 'EN', 'DE');

-- 4. Create document_type enum  
CREATE TYPE public.document_type AS ENUM ('TERMS');

-- 5. Create user_roles table (system-level roles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.system_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- 7. Create role_permissions table (which roles have which permissions by default)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.system_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 8. Create user_permission_overrides table (per-user permission overrides)
CREATE TABLE public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_id, event_id)
);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- 9. Create event_documents table
CREATE TABLE public.event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type public.document_type NOT NULL DEFAULT 'TERMS',
  language public.document_language NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, type, language)
);

ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;

-- 10. Add public_request_token and public_requests_enabled to events
ALTER TABLE public.events 
ADD COLUMN public_request_token TEXT UNIQUE,
ADD COLUMN public_requests_enabled BOOLEAN NOT NULL DEFAULT false;

-- 11. Create stand_requests table
CREATE TABLE public.stand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  vat TEXT,
  requested_stand_label TEXT,
  requested_area NUMERIC,
  requested_width NUMERIC,
  requested_height NUMERIC,
  water_connections INTEGER NOT NULL DEFAULT 0,
  power_option public.power_option NOT NULL DEFAULT 'NONE',
  light_points INTEGER NOT NULL DEFAULT 0,
  construction_booked BOOLEAN NOT NULL DEFAULT false,
  carpet_included BOOLEAN NOT NULL DEFAULT false,
  surface_type public.surface_type NOT NULL DEFAULT 'EMPTY',
  notes TEXT,
  status public.request_status NOT NULL DEFAULT 'NEW',
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_exhibitor_id UUID REFERENCES public.exhibitors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stand_requests ENABLE ROW LEVEL SECURITY;

-- 12. Create helper function to check if user has system role (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_system_role(_user_id UUID, _role public.system_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 13. Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'ADMIN'
  )
$$;

-- 14. Create helper function to check user permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_name TEXT, _event_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perm_id UUID;
  has_override BOOLEAN;
  override_granted BOOLEAN;
  has_role_perm BOOLEAN;
BEGIN
  -- Get permission ID
  SELECT id INTO perm_id FROM public.permissions WHERE name = _permission_name;
  IF perm_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for user-specific override first
  SELECT granted INTO override_granted
  FROM public.user_permission_overrides
  WHERE user_id = _user_id
    AND permission_id = perm_id
    AND (event_id = _event_id OR (event_id IS NULL AND _event_id IS NULL))
  LIMIT 1;

  IF FOUND THEN
    RETURN override_granted;
  END IF;

  -- System admins have all permissions
  IF public.is_system_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Check role-based permissions
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_id = perm_id
  ) INTO has_role_perm;

  RETURN has_role_perm;
END;
$$;

-- 15. RLS Policies for user_roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- 16. RLS Policies for permissions
CREATE POLICY "Anyone authenticated can view permissions"
ON public.permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage permissions"
ON public.permissions
FOR ALL
USING (public.is_system_admin(auth.uid()));

-- 17. RLS Policies for role_permissions
CREATE POLICY "Anyone authenticated can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (public.is_system_admin(auth.uid()));

-- 18. RLS Policies for user_permission_overrides
CREATE POLICY "Admins can manage permission overrides"
ON public.user_permission_overrides
FOR ALL
USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view their own overrides"
ON public.user_permission_overrides
FOR SELECT
USING (auth.uid() = user_id);

-- 19. RLS Policies for event_documents
CREATE POLICY "Event members can view documents"
ON public.event_documents
FOR SELECT
USING (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members with SETTINGS_MANAGE can create documents"
ON public.event_documents
FOR INSERT
WITH CHECK (
  public.is_event_member(auth.uid(), event_id) 
  AND public.has_permission(auth.uid(), 'SETTINGS_MANAGE', event_id)
);

CREATE POLICY "Members with SETTINGS_MANAGE can update documents"
ON public.event_documents
FOR UPDATE
USING (
  public.is_event_member(auth.uid(), event_id)
  AND public.has_permission(auth.uid(), 'SETTINGS_MANAGE', event_id)
);

CREATE POLICY "Members with SETTINGS_MANAGE can delete documents"
ON public.event_documents
FOR DELETE
USING (
  public.is_event_member(auth.uid(), event_id)
  AND public.has_permission(auth.uid(), 'SETTINGS_MANAGE', event_id)
);

-- 20. RLS Policies for stand_requests
-- Public can insert if they have the correct token (no auth needed - handled by token check)
CREATE POLICY "Anyone can create stand requests"
ON public.stand_requests
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Event members can view requests"
ON public.stand_requests
FOR SELECT
USING (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members with REQUESTS_MANAGE can update requests"
ON public.stand_requests
FOR UPDATE
USING (
  public.is_event_member(auth.uid(), event_id)
  AND public.has_permission(auth.uid(), 'REQUESTS_MANAGE', event_id)
);

CREATE POLICY "Members with REQUESTS_MANAGE can delete requests"
ON public.stand_requests
FOR DELETE
USING (
  public.is_event_member(auth.uid(), event_id)
  AND public.has_permission(auth.uid(), 'REQUESTS_MANAGE', event_id)
);

-- 21. Insert default permissions
INSERT INTO public.permissions (name, description) VALUES
  ('EVENTS_VIEW', 'Bekijk evenementen'),
  ('EVENTS_MANAGE', 'Beheer evenementen'),
  ('EXHIBITORS_VIEW', 'Bekijk exposanten'),
  ('EXHIBITORS_MANAGE', 'Beheer exposanten'),
  ('FLOORPLAN_VIEW', 'Bekijk plattegrond'),
  ('FLOORPLAN_EDIT', 'Bewerk plattegrond'),
  ('USERS_MANAGE', 'Beheer gebruikers'),
  ('SETTINGS_MANAGE', 'Beheer instellingen'),
  ('REQUESTS_VIEW', 'Bekijk aanvragen'),
  ('REQUESTS_MANAGE', 'Beheer aanvragen');

-- 22. Insert default role permissions
-- ADMIN gets all permissions (handled by is_system_admin check)
-- MANAGER permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'MANAGER', id FROM public.permissions 
WHERE name IN ('EVENTS_VIEW', 'EVENTS_MANAGE', 'EXHIBITORS_VIEW', 'EXHIBITORS_MANAGE', 
               'FLOORPLAN_VIEW', 'FLOORPLAN_EDIT', 'SETTINGS_MANAGE', 'REQUESTS_VIEW', 'REQUESTS_MANAGE');

-- BUILDER permissions  
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'BUILDER', id FROM public.permissions 
WHERE name IN ('EVENTS_VIEW', 'EXHIBITORS_VIEW', 'FLOORPLAN_VIEW', 'REQUESTS_VIEW');

-- 23. Create storage bucket for event documents
INSERT INTO storage.buckets (id, name, public) VALUES ('event-documents', 'event-documents', false);

-- 24. Storage policies for event-documents bucket
CREATE POLICY "Authenticated users can upload event documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-documents');

CREATE POLICY "Event members can view event documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'event-documents');

CREATE POLICY "Event members can delete event documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'event-documents');

-- 25. Triggers for updated_at
CREATE TRIGGER update_event_documents_updated_at
BEFORE UPDATE ON public.event_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stand_requests_updated_at
BEFORE UPDATE ON public.stand_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
