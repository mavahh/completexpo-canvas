-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'name', new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Event members table (role enum)
CREATE TYPE public.event_role AS ENUM ('ADMIN', 'USER');

CREATE TABLE public.event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  role public.event_role NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check event membership (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_event_member(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_members
    WHERE user_id = _user_id AND event_id = _event_id
  )
$$;

-- Events policies (only members can see/modify events)
CREATE POLICY "Members can view their events"
ON public.events FOR SELECT
USING (public.is_event_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can update events"
ON public.events FOR UPDATE
USING (public.is_event_member(auth.uid(), id));

CREATE POLICY "Members can delete events"
ON public.events FOR DELETE
USING (public.is_event_member(auth.uid(), id));

-- Event members policies
CREATE POLICY "Users can view their own memberships"
ON public.event_members FOR SELECT
USING (auth.uid() = user_id OR public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Event members can add members"
ON public.event_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can delete memberships"
ON public.event_members FOR DELETE
USING (public.is_event_member(auth.uid(), event_id));

-- Exhibitors table
CREATE TABLE public.exhibitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  vat TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exhibitors ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_exhibitors_updated_at
  BEFORE UPDATE ON public.exhibitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Exhibitors policies
CREATE POLICY "Members can view exhibitors"
ON public.exhibitors FOR SELECT
USING (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can create exhibitors"
ON public.exhibitors FOR INSERT
WITH CHECK (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can update exhibitors"
ON public.exhibitors FOR UPDATE
USING (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can delete exhibitors"
ON public.exhibitors FOR DELETE
USING (public.is_event_member(auth.uid(), event_id));

-- Floorplans table
CREATE TABLE public.floorplans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hall TEXT,
  width INTEGER NOT NULL DEFAULT 1000,
  height INTEGER NOT NULL DEFAULT 800,
  grid_size INTEGER NOT NULL DEFAULT 20,
  background_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.floorplans ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_floorplans_updated_at
  BEFORE UPDATE ON public.floorplans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Floorplans policies
CREATE POLICY "Members can view floorplans"
ON public.floorplans FOR SELECT
USING (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can create floorplans"
ON public.floorplans FOR INSERT
WITH CHECK (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can update floorplans"
ON public.floorplans FOR UPDATE
USING (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can delete floorplans"
ON public.floorplans FOR DELETE
USING (public.is_event_member(auth.uid(), event_id));

-- Stands table (objects on floorplan)
CREATE TABLE public.stands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id UUID NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  exhibitor_id UUID REFERENCES public.exhibitors(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION NOT NULL DEFAULT 100,
  height DOUBLE PRECISION NOT NULL DEFAULT 60,
  rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(floorplan_id, label)
);

ALTER TABLE public.stands ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_stands_updated_at
  BEFORE UPDATE ON public.stands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Stands policies
CREATE POLICY "Members can view stands"
ON public.stands FOR SELECT
USING (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can create stands"
ON public.stands FOR INSERT
WITH CHECK (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can update stands"
ON public.stands FOR UPDATE
USING (public.is_event_member(auth.uid(), event_id));

CREATE POLICY "Members can delete stands"
ON public.stands FOR DELETE
USING (public.is_event_member(auth.uid(), event_id));