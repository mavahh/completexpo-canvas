-- Create invite_type enum
CREATE TYPE public.invite_type AS ENUM (
  'DEMO_APPROVAL',
  'ACCOUNT_INVITE', 
  'EVENT_INVITE',
  'EXHIBITOR_INVITE'
);

-- Create account_role enum
CREATE TYPE public.account_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Create invites table
CREATE TABLE public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.invite_type NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by_user_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_outbox table
CREATE TABLE public.email_outbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create exhibitor_portal_tokens table
CREATE TABLE public.exhibitor_portal_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  exhibitor_id UUID REFERENCES public.exhibitors(id) ON DELETE SET NULL,
  email TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create account_members table (replaces using profiles.account_id + is_account_admin)
CREATE TABLE public.account_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.account_role NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for invites
CREATE POLICY "Super admins can view all invites"
  ON public.invites FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Account admins can view account invites"
  ON public.invites FOR SELECT
  USING (
    account_id IS NOT NULL AND
    account_id = get_user_account_id(auth.uid()) AND
    is_account_admin(auth.uid())
  );

CREATE POLICY "Super admins can create invites"
  ON public.invites FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Account admins can create account invites"
  ON public.invites FOR INSERT
  WITH CHECK (
    account_id IS NOT NULL AND
    account_id = get_user_account_id(auth.uid()) AND
    is_account_admin(auth.uid())
  );

CREATE POLICY "Super admins can update invites"
  ON public.invites FOR UPDATE
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Anyone can select invite by token"
  ON public.invites FOR SELECT
  USING (true);

-- RLS policies for email_outbox
CREATE POLICY "Super admins can view email outbox"
  ON public.email_outbox FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create email outbox"
  ON public.email_outbox FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Account admins can create email outbox"
  ON public.email_outbox FOR INSERT
  WITH CHECK (is_account_admin(auth.uid()));

-- RLS policies for exhibitor_portal_tokens
CREATE POLICY "Event members can view portal tokens"
  ON public.exhibitor_portal_tokens FOR SELECT
  USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Event members can create portal tokens"
  ON public.exhibitor_portal_tokens FOR INSERT
  WITH CHECK (is_event_member(auth.uid(), event_id));

CREATE POLICY "Event members can update portal tokens"
  ON public.exhibitor_portal_tokens FOR UPDATE
  USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Event members can delete portal tokens"
  ON public.exhibitor_portal_tokens FOR DELETE
  USING (is_event_member(auth.uid(), event_id));

CREATE POLICY "Anyone can select by token"
  ON public.exhibitor_portal_tokens FOR SELECT
  USING (true);

-- RLS policies for account_members
CREATE POLICY "Super admins can view all account members"
  ON public.account_members FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Account members can view own account members"
  ON public.account_members FOR SELECT
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account owners can manage members"
  ON public.account_members FOR ALL
  USING (
    account_id = get_user_account_id(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = account_members.account_id
        AND am.user_id = auth.uid()
        AND am.role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Super admins can manage all account members"
  ON public.account_members FOR ALL
  USING (is_super_admin(auth.uid()));

-- Create updated_at trigger for exhibitor_portal_tokens
CREATE TRIGGER update_exhibitor_portal_tokens_updated_at
  BEFORE UPDATE ON public.exhibitor_portal_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for account_members
CREATE TRIGGER update_account_members_updated_at
  BEFORE UPDATE ON public.account_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user is account owner
CREATE OR REPLACE FUNCTION public.is_account_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = _user_id AND role = 'OWNER'
  )
$$;

-- Create function to get account role
CREATE OR REPLACE FUNCTION public.get_account_role(_user_id uuid, _account_id uuid)
RETURNS public.account_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.account_members
  WHERE user_id = _user_id AND account_id = _account_id
  LIMIT 1
$$;