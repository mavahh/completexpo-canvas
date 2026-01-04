-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;

-- Recreate as a permissive policy (default)
CREATE POLICY "Authenticated users can create events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);