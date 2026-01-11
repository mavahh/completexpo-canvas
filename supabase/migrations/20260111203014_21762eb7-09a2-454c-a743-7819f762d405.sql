-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_account_role(uuid, uuid);

-- Fix the infinite recursion issue in account_members policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Account owners can manage members" ON public.account_members;

-- Create a security definer function to check account role without recursion
CREATE OR REPLACE FUNCTION public.get_account_role(_account_id uuid, _user_id uuid)
RETURNS account_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.account_members 
  WHERE account_id = _account_id AND user_id = _user_id
  LIMIT 1
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Account owners can manage members"
ON public.account_members
FOR ALL
USING (
  (account_id = get_user_account_id(auth.uid())) 
  AND (get_account_role(account_id, auth.uid()) IN ('OWNER', 'ADMIN'))
);

-- Also add a policy to allow users to insert themselves (for invite acceptance)
CREATE POLICY "Users can insert themselves as members"
ON public.account_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Add update policy for invites to allow accepting invites
DROP POLICY IF EXISTS "Anyone can update invite by token" ON public.invites;
CREATE POLICY "Anyone can update own invite by token"
ON public.invites
FOR UPDATE
USING (true)
WITH CHECK (true);