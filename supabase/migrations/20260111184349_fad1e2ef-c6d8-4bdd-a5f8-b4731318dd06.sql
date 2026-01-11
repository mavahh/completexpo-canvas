
-- Add status column to stands table for Floorplan Pro
ALTER TABLE public.stands 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'AVAILABLE'
CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'));

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_stands_status ON public.stands(status);
CREATE INDEX IF NOT EXISTS idx_stands_floorplan_status ON public.stands(floorplan_id, status);
