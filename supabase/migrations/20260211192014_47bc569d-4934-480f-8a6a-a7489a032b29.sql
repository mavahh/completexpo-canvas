
-- Fix: Replace overly permissive account INSERT policy
-- Only allow account creation when user has a valid DEMO_APPROVAL invite
DROP POLICY IF EXISTS "Authenticated users can create accounts" ON public.accounts;

CREATE POLICY "Users with valid demo invite can create accounts"
ON public.accounts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.invites
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND accepted_at IS NULL
      AND expires_at > now()
      AND type = 'DEMO_APPROVAL'
  )
);
