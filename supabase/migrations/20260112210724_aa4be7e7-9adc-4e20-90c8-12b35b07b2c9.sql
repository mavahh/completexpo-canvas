-- Fix foreign key constraint to allow account deletion
ALTER TABLE public.demo_requests
DROP CONSTRAINT IF EXISTS demo_requests_created_account_id_fkey;

ALTER TABLE public.demo_requests
ADD CONSTRAINT demo_requests_created_account_id_fkey
FOREIGN KEY (created_account_id)
REFERENCES public.accounts(id)
ON DELETE SET NULL;