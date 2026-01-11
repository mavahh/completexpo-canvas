-- =====================================================
-- Multi-tenant Account System
-- =====================================================

-- 1. Create accounts table (organizations/tenants)
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 2. Create demo_requests table for pending signups
CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  created_account_id uuid REFERENCES public.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- 3. Add account_id to profiles (link users to accounts)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_account_admin boolean DEFAULT false;

-- 4. Add account_id to events (scope events to accounts)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

-- 5. Create super_admins table (platform-level admins like you)
-- These users can see everything across all accounts
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 6. Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = _user_id
  )
$$;

-- 7. Helper function to get user's account
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE id = _user_id
$$;

-- 8. RLS Policies for accounts
-- Super admins can see all accounts
CREATE POLICY "Super admins can view all accounts"
ON public.accounts FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can manage all accounts
CREATE POLICY "Super admins can manage accounts"
ON public.accounts FOR ALL
USING (is_super_admin(auth.uid()));

-- Account members can view their own account
CREATE POLICY "Users can view their own account"
ON public.accounts FOR SELECT
USING (id = get_user_account_id(auth.uid()));

-- 9. RLS Policies for demo_requests
-- Anyone can create a demo request
CREATE POLICY "Anyone can create demo requests"
ON public.demo_requests FOR INSERT
WITH CHECK (true);

-- Super admins can view all demo requests
CREATE POLICY "Super admins can view demo requests"
ON public.demo_requests FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can manage demo requests
CREATE POLICY "Super admins can manage demo requests"
ON public.demo_requests FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete demo requests"
ON public.demo_requests FOR DELETE
USING (is_super_admin(auth.uid()));

-- Users can view their own request
CREATE POLICY "Users can view their own demo request"
ON public.demo_requests FOR SELECT
USING (user_id = auth.uid());

-- 10. RLS Policies for super_admins
CREATE POLICY "Super admins can view super admins"
ON public.super_admins FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Only super admins can manage super admins"
ON public.super_admins FOR ALL
USING (is_super_admin(auth.uid()));

-- 11. Update events RLS to be account-scoped
-- Drop existing policies first
DROP POLICY IF EXISTS "Members can view their events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Members can update events" ON public.events;
DROP POLICY IF EXISTS "Members can delete events" ON public.events;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all events"
ON public.events FOR ALL
USING (is_super_admin(auth.uid()));

-- Account members can view events in their account
CREATE POLICY "Account members can view account events"
ON public.events FOR SELECT
USING (
  is_super_admin(auth.uid()) 
  OR account_id = get_user_account_id(auth.uid())
  OR is_event_member(auth.uid(), id)
);

-- Account admins can create events for their account
CREATE POLICY "Account admins can create events"
ON public.events FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    account_id = get_user_account_id(auth.uid())
    AND (SELECT is_account_admin FROM public.profiles WHERE id = auth.uid())
  )
);

-- Event members can update their events
CREATE POLICY "Members can update events"
ON public.events FOR UPDATE
USING (
  is_super_admin(auth.uid())
  OR is_event_member(auth.uid(), id)
);

-- Event admins can delete events
CREATE POLICY "Event admins can delete events"
ON public.events FOR DELETE
USING (
  is_super_admin(auth.uid())
  OR (
    is_event_member(auth.uid(), id)
    AND EXISTS (
      SELECT 1 FROM event_members 
      WHERE event_id = events.id 
      AND user_id = auth.uid() 
      AND role = 'ADMIN'
    )
  )
);

-- 12. Update profiles RLS to support account-scoped user management
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_super_admin(auth.uid()));

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- Account admins can view profiles in their account
CREATE POLICY "Account admins can view account profiles"
ON public.profiles FOR SELECT
USING (
  account_id = get_user_account_id(auth.uid())
  AND (SELECT is_account_admin FROM public.profiles WHERE id = auth.uid())
);

-- Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- Account admins can update profiles in their account
CREATE POLICY "Account admins can update account profiles"
ON public.profiles FOR UPDATE
USING (
  account_id = get_user_account_id(auth.uid())
  AND (SELECT is_account_admin FROM public.profiles WHERE id = auth.uid())
);

-- 13. Make current users super admins
INSERT INTO public.super_admins (user_id)
SELECT id FROM public.profiles
WHERE email IN ('demo@expodoc.com', 'liam@lvhfreelance.com')
ON CONFLICT (user_id) DO NOTHING;

-- 14. Update triggers
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demo_requests_updated_at
BEFORE UPDATE ON public.demo_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();