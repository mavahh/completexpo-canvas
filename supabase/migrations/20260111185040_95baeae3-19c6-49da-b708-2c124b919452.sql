-- Create security definer function to check if user is account admin (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_account_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_account_admin FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Account admins can view account profiles" ON public.profiles;
DROP POLICY IF EXISTS "Account admins can update account profiles" ON public.profiles;

-- Recreate policies using the security definer function
CREATE POLICY "Account admins can view account profiles" 
ON public.profiles 
FOR SELECT 
USING (
  account_id = get_user_account_id(auth.uid()) 
  AND is_account_admin(auth.uid())
);

CREATE POLICY "Account admins can update account profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  account_id = get_user_account_id(auth.uid()) 
  AND is_account_admin(auth.uid())
);