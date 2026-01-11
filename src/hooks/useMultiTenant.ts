import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface Account {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approved_at: string | null;
  created_at: string;
}

export interface DemoRequest {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  processed_at: string | null;
  created_at: string;
}

export interface MultiTenantState {
  loading: boolean;
  isSuperAdmin: boolean;
  isAccountAdmin: boolean;
  account: Account | null;
  hasPendingRequest: boolean;
  refetch: () => Promise<void>;
}

export function useMultiTenant(): MultiTenantState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAccountAdmin, setIsAccountAdmin] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if super admin
      const { data: superAdminData } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setIsSuperAdmin(!!superAdminData);

      // Get profile with account info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('account_id, is_account_admin')
        .eq('id', user.id)
        .single();

      setIsAccountAdmin(profileData?.is_account_admin ?? false);

      if (profileData?.account_id) {
        // Fetch account details
        const { data: accountData } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', profileData.account_id)
          .single();

        setAccount(accountData as Account | null);
      }

      // Check for pending demo request
      const { data: requestData } = await supabase
        .from('demo_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      setHasPendingRequest(!!requestData);
    } catch (error) {
      console.error('Error fetching multi-tenant data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    isSuperAdmin,
    isAccountAdmin,
    account,
    hasPendingRequest,
    refetch: fetchData,
  };
}

// Hook for super admin to manage demo requests
export function useDemoRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DemoRequest[]>([]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('demo_requests')
        .select('*')
        .order('created_at', { ascending: false });

      setRequests((data as DemoRequest[]) || []);
    } catch (error) {
      console.error('Error fetching demo requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const approveRequest = async (requestId: string, companyName: string, userId: string | null) => {
    try {
      // Create account
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: companyName,
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Update request
      await supabase
        .from('demo_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          created_account_id: accountData.id,
        })
        .eq('id', requestId);

      // Link user to account if exists
      if (userId) {
        await supabase
          .from('profiles')
          .update({
            account_id: accountData.id,
            is_account_admin: true,
          })
          .eq('id', userId);
      }

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await supabase
        .from('demo_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    loading,
    requests,
    refetch: fetchRequests,
    approveRequest,
    rejectRequest,
  };
}
