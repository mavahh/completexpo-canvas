
-- Add opacity column to editor_layers
ALTER TABLE public.editor_layers ADD COLUMN IF NOT EXISTS opacity integer NOT NULL DEFAULT 100;

-- Insert missing layers for ALL existing floorplans that have 0 layers
INSERT INTO public.editor_layers (floorplan_id, name, type, sort_order, is_visible, is_locked, opacity)
SELECT f.id, 'Plattegrond', 'plattegrond', 0, true, false, 100
FROM public.floorplans f
WHERE NOT EXISTS (SELECT 1 FROM public.editor_layers el WHERE el.floorplan_id = f.id AND el.type = 'plattegrond');

INSERT INTO public.editor_layers (floorplan_id, name, type, sort_order, is_visible, is_locked, opacity)
SELECT f.id, 'Technisch plan', 'technisch', 1, true, false, 70
FROM public.floorplans f
WHERE NOT EXISTS (SELECT 1 FROM public.editor_layers el WHERE el.floorplan_id = f.id AND el.type = 'technisch');

INSERT INTO public.editor_layers (floorplan_id, name, type, sort_order, is_visible, is_locked, opacity)
SELECT f.id, 'Standenplan', 'standenplan', 2, true, false, 100
FROM public.floorplans f
WHERE NOT EXISTS (SELECT 1 FROM public.editor_layers el WHERE el.floorplan_id = f.id AND el.type = 'standenplan');
