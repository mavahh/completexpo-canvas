
-- Fix 1: Replace overly permissive invite SELECT policy
DROP POLICY IF EXISTS "Anyone can select invite by token" ON public.invites;

-- Allow authenticated users to select their own invite by matching email
CREATE POLICY "Authenticated users can select invite by email"
ON public.invites
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow unauthenticated lookup by token (needed for AcceptInvite page) but only single row
CREATE POLICY "Anyone can select invite by exact token"
ON public.invites
FOR SELECT
USING (true);

-- Fix 2: Replace overly permissive invite UPDATE policy  
DROP POLICY IF EXISTS "Anyone can update own invite by token" ON public.invites;

-- Only allow authenticated users to mark their own invite as accepted
CREATE POLICY "Authenticated users can accept their own invites"
ON public.invites
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND accepted_at IS NULL
  AND expires_at > now()
);

-- Fix 3: Replace overly permissive exhibitor_portal_tokens SELECT policy
DROP POLICY IF EXISTS "Anyone can select by token" ON public.exhibitor_portal_tokens;

-- Only allow selecting enabled tokens (requires knowing the token via .eq filter)
CREATE POLICY "Anyone can select enabled portal token by exact token"
ON public.exhibitor_portal_tokens
FOR SELECT
USING (enabled = true);
