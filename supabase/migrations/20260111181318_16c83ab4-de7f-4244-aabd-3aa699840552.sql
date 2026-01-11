-- Add foreign key from event_members.user_id to profiles.id
ALTER TABLE public.event_members
  ADD CONSTRAINT event_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;