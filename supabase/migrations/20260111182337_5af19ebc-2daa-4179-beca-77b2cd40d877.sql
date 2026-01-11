-- =====================================================
-- Phase 3: Extended Permissions System
-- =====================================================

-- 1. Add global module visibility to profiles (not user_roles to keep roles separate)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS global_module_visibility jsonb DEFAULT '{"DASHBOARD": true, "EVENTS": true, "USERS": false, "SETTINGS": false, "CRM": false}'::jsonb;

-- 2. Extend event_members with permissions overrides and tile visibility
ALTER TABLE public.event_members
  ADD COLUMN IF NOT EXISTS permissions_override jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visible_tiles jsonb DEFAULT NULL;

-- Comment: permissions_override structure:
-- { "FLOORPLAN_VIEW": true, "FLOORPLAN_EDIT": false, "EXHIBITORS_VIEW": true, "EXHIBITORS_MANAGE": false, ... }

-- Comment: visible_tiles structure:
-- { "handbook": true, "floorplan": true, "orders": false, "exhibitors": true, ... }

-- 3. Create default permission sets per role (for reference/documentation)
-- These will be used in the application logic

-- 4. Create a function to check event-level permissions including overrides
CREATE OR REPLACE FUNCTION public.has_event_permission(
  _user_id uuid,
  _event_id uuid,
  _permission_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_role event_role;
  override_value boolean;
  default_perms jsonb;
BEGIN
  -- System admins have all permissions
  IF public.is_system_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Get event membership
  SELECT role, (permissions_override->>_permission_name)::boolean
  INTO member_role, override_value
  FROM public.event_members
  WHERE user_id = _user_id AND event_id = _event_id;

  -- No membership = no permission
  IF member_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for explicit override first
  IF override_value IS NOT NULL THEN
    RETURN override_value;
  END IF;

  -- Apply role defaults
  -- Event ADMIN gets everything
  IF member_role = 'ADMIN' THEN
    RETURN TRUE;
  END IF;

  -- Event USER gets view permissions by default
  IF member_role = 'USER' THEN
    -- VIEW permissions are allowed, MANAGE/EDIT permissions are not
    IF _permission_name LIKE '%_VIEW' THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 5. Create a function to check tile visibility
CREATE OR REPLACE FUNCTION public.is_tile_visible(
  _user_id uuid,
  _event_id uuid,
  _tile_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tile_visible boolean;
  member_role event_role;
BEGIN
  -- System admins see everything
  IF public.is_system_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Get membership and tile visibility
  SELECT role, (visible_tiles->>_tile_name)::boolean
  INTO member_role, tile_visible
  FROM public.event_members
  WHERE user_id = _user_id AND event_id = _event_id;

  -- No membership = not visible
  IF member_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If explicit setting exists, use it
  IF tile_visible IS NOT NULL THEN
    RETURN tile_visible;
  END IF;

  -- Default: all tiles visible for members (unless explicitly hidden)
  RETURN TRUE;
END;
$$;

-- 6. Create function to check global module visibility
CREATE OR REPLACE FUNCTION public.is_module_visible(
  _user_id uuid,
  _module_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  module_visible boolean;
BEGIN
  -- System admins see everything
  IF public.is_system_admin(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Get module visibility from profile
  SELECT (global_module_visibility->>_module_name)::boolean
  INTO module_visible
  FROM public.profiles
  WHERE id = _user_id;

  -- Default to false if not set
  RETURN COALESCE(module_visible, FALSE);
END;
$$;

-- 7. Update profiles RLS to allow admins to view and update all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR is_system_admin(auth.uid())
  OR has_permission(auth.uid(), 'USERS_VIEW')
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id 
  OR is_system_admin(auth.uid())
  OR has_permission(auth.uid(), 'USERS_MANAGE')
);

-- 8. Insert additional permissions if not exists
INSERT INTO public.permissions (name, description) VALUES
  ('EVENTS_VIEW', 'Kan evenementen bekijken'),
  ('EVENTS_MANAGE', 'Kan evenementen aanmaken en bewerken'),
  ('FLOORPLAN_VIEW', 'Kan plattegronden bekijken'),
  ('FLOORPLAN_EDIT', 'Kan plattegronden bewerken'),
  ('EXHIBITORS_VIEW', 'Kan exposanten bekijken'),
  ('EXHIBITORS_MANAGE', 'Kan exposanten beheren'),
  ('REQUESTS_VIEW', 'Kan aanvragen bekijken'),
  ('REQUESTS_MANAGE', 'Kan aanvragen verwerken'),
  ('SETTINGS_VIEW', 'Kan instellingen bekijken'),
  ('SETTINGS_MANAGE', 'Kan instellingen beheren'),
  ('USERS_VIEW', 'Kan gebruikers bekijken'),
  ('USERS_MANAGE', 'Kan gebruikers beheren'),
  ('EXPORT_VIEW', 'Kan exports bekijken'),
  ('EXPORT_USE', 'Kan exports maken')
ON CONFLICT (name) DO NOTHING;

-- 9. Set up default role permissions for MANAGER and BUILDER
-- First, get the permission IDs and insert role_permissions
DO $$
DECLARE
  perm_id uuid;
BEGIN
  -- MANAGER gets most permissions except USERS_MANAGE
  FOR perm_id IN 
    SELECT id FROM public.permissions 
    WHERE name IN ('EVENTS_VIEW', 'EVENTS_MANAGE', 'FLOORPLAN_VIEW', 'FLOORPLAN_EDIT', 
                   'EXHIBITORS_VIEW', 'EXHIBITORS_MANAGE', 'REQUESTS_VIEW', 'REQUESTS_MANAGE',
                   'SETTINGS_VIEW', 'SETTINGS_MANAGE', 'USERS_VIEW', 'EXPORT_VIEW', 'EXPORT_USE')
  LOOP
    INSERT INTO public.role_permissions (role, permission_id)
    VALUES ('MANAGER', perm_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- BUILDER gets limited permissions
  FOR perm_id IN 
    SELECT id FROM public.permissions 
    WHERE name IN ('EVENTS_VIEW', 'FLOORPLAN_VIEW', 'EXHIBITORS_VIEW')
  LOOP
    INSERT INTO public.role_permissions (role, permission_id)
    VALUES ('BUILDER', perm_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;