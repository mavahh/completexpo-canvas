-- Grant execute permissions on public RPC functions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_public_link_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_event_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_floorplans_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_stands_by_token(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_exhibitors_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_exhibitor_services_by_token(text) TO anon, authenticated;