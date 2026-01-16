-- Public RPCs for the public floorplan viewer (avoid weakening RLS)

CREATE OR REPLACE FUNCTION public.get_public_link_by_token(_token text)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  token text,
  enabled boolean,
  allow_downloads boolean,
  default_floorplan_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    epl.id,
    epl.event_id,
    epl.token,
    epl.enabled,
    epl.allow_downloads,
    epl.default_floorplan_id
  FROM public.event_public_links epl
  WHERE epl.token = _token
    AND epl.enabled = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_event_by_token(_token text)
RETURNS TABLE (
  id uuid,
  name text,
  location text,
  start_date date,
  end_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.id,
    e.name,
    e.location,
    e.start_date,
    e.end_date
  FROM public.events e
  JOIN public.event_public_links epl
    ON epl.event_id = e.id
  WHERE epl.token = _token
    AND epl.enabled = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_floorplans_by_token(_token text)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  name text,
  hall text,
  width integer,
  height integer,
  grid_size integer,
  background_url text,
  background_opacity integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    f.id,
    f.event_id,
    f.name,
    f.hall,
    f.width,
    f.height,
    f.grid_size,
    f.background_url,
    f.background_opacity
  FROM public.floorplans f
  JOIN public.event_public_links epl
    ON epl.event_id = f.event_id
  WHERE epl.token = _token
    AND epl.enabled = true
  ORDER BY f.name;
$$;

CREATE OR REPLACE FUNCTION public.get_public_stands_by_token(_token text, _floorplan_id uuid)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  floorplan_id uuid,
  exhibitor_id uuid,
  label text,
  x double precision,
  y double precision,
  width double precision,
  height double precision,
  rotation double precision,
  color text,
  notes text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id,
    s.event_id,
    s.floorplan_id,
    s.exhibitor_id,
    s.label,
    s.x,
    s.y,
    s.width,
    s.height,
    s.rotation,
    s.color,
    s.notes,
    s.status
  FROM public.stands s
  JOIN public.event_public_links epl
    ON epl.event_id = s.event_id
  WHERE epl.token = _token
    AND epl.enabled = true
    AND s.floorplan_id = _floorplan_id
  ORDER BY s.label;
$$;

CREATE OR REPLACE FUNCTION public.get_public_exhibitors_by_token(_token text)
RETURNS TABLE (
  id uuid,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ex.id,
    ex.name
  FROM public.exhibitors ex
  JOIN public.event_public_links epl
    ON epl.event_id = ex.event_id
  WHERE epl.token = _token
    AND epl.enabled = true
  ORDER BY ex.name;
$$;

CREATE OR REPLACE FUNCTION public.get_public_exhibitor_services_by_token(_token text)
RETURNS TABLE (
  exhibitor_id uuid,
  water_connections integer,
  power_option power_option,
  light_points integer,
  construction_booked boolean,
  carpet_included boolean,
  surface_type surface_type,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    es.exhibitor_id,
    es.water_connections,
    es.power_option,
    es.light_points,
    es.construction_booked,
    es.carpet_included,
    es.surface_type,
    es.notes
  FROM public.exhibitor_services es
  JOIN public.exhibitors ex
    ON ex.id = es.exhibitor_id
  JOIN public.event_public_links epl
    ON epl.event_id = ex.event_id
  WHERE epl.token = _token
    AND epl.enabled = true;
$$;