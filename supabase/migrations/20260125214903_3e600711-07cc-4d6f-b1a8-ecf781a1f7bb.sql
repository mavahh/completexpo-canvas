-- Create floorplan_edit_sessions table for soft locking
CREATE TABLE public.floorplan_edit_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floorplan_id UUID NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.floorplan_edit_sessions ENABLE ROW LEVEL SECURITY;

-- Create unique constraint so each user can only have one session per floorplan
CREATE UNIQUE INDEX idx_floorplan_edit_sessions_unique ON public.floorplan_edit_sessions(floorplan_id, user_id);

-- Create index for quick lookup
CREATE INDEX idx_floorplan_edit_sessions_floorplan ON public.floorplan_edit_sessions(floorplan_id);
CREATE INDEX idx_floorplan_edit_sessions_last_seen ON public.floorplan_edit_sessions(last_seen_at);

-- Policy: Users can view sessions for floorplans they have access to
CREATE POLICY "Users can view edit sessions for accessible floorplans" 
ON public.floorplan_edit_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.floorplans f
    JOIN public.event_members em ON em.event_id = f.event_id
    WHERE f.id = floorplan_id AND em.user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- Policy: Users can create/update their own sessions
CREATE POLICY "Users can manage their own edit sessions" 
ON public.floorplan_edit_sessions 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to clean up stale sessions (older than 2 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_stale_edit_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.floorplan_edit_sessions
  WHERE last_seen_at < now() - INTERVAL '2 minutes';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_stale_edit_sessions() TO authenticated;