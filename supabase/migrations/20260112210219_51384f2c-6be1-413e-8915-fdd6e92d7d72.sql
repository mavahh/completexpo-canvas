-- Allow authenticated users to create their own account (for demo approvals)
CREATE POLICY "Authenticated users can create accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow the user to become a member of the account they just created
-- This is already covered by "Users can insert themselves as members" policy