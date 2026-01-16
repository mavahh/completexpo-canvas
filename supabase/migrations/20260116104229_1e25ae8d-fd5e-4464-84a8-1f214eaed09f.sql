-- Enable realtime for POS tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_sale_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_shifts;