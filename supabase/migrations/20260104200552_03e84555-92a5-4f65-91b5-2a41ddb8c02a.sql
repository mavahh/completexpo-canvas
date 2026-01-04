-- Drop all existing policies on events table
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Members can view their events" ON public.events;
DROP POLICY IF EXISTS "Members can update events" ON public.events;
DROP POLICY IF EXISTS "Members can delete events" ON public.events;

-- Recreate as permissive policies (TO authenticated ensures only logged in users)
CREATE POLICY "Authenticated users can create events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Members can view their events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (is_event_member(auth.uid(), id));

CREATE POLICY "Members can update events" 
ON public.events 
FOR UPDATE 
TO authenticated
USING (is_event_member(auth.uid(), id));

CREATE POLICY "Members can delete events" 
ON public.events 
FOR DELETE 
TO authenticated
USING (is_event_member(auth.uid(), id));