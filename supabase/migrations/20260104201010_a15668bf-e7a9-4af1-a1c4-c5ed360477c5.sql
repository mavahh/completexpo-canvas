-- Function: create event + membership + default floorplan, then return event row
CREATE OR REPLACE FUNCTION public.create_event_with_defaults(
  _name text,
  _location text,
  _start_date date,
  _end_date date
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_event public.events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.events (name, location, start_date, end_date)
  VALUES (
    _name,
    NULLIF(_location, ''),
    _start_date,
    _end_date
  )
  RETURNING * INTO new_event;

  INSERT INTO public.event_members (user_id, event_id, role)
  VALUES (auth.uid(), new_event.id, 'ADMIN');

  BEGIN
    INSERT INTO public.floorplans (event_id, name, width, height, grid_size)
    VALUES (new_event.id, 'Hoofdplattegrond', 1200, 800, 20);
  EXCEPTION WHEN OTHERS THEN
    -- Keep event creation working even if default floorplan fails
    NULL;
  END;

  RETURN new_event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_event_with_defaults(text, text, date, date) TO authenticated;