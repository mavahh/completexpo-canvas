import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PosCategory, PosProduct, PosRegister, PosShift } from '@/types/pos';

export function usePosCategories(eventId: string | null) {
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!eventId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pos_categories')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}

export function usePosProducts(eventId: string | null, activeOnly = false) {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!eventId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('pos_products')
        .select('*, category:pos_categories(*)')
        .eq('event_id', eventId)
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, activeOnly]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
}

export function usePosRegisters(eventId: string | null, activeOnly = false) {
  const [registers, setRegisters] = useState<PosRegister[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegisters = useCallback(async () => {
    if (!eventId) {
      setRegisters([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('pos_registers')
        .select('*')
        .eq('event_id', eventId)
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRegisters(data || []);
    } catch (error) {
      console.error('Error fetching registers:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, activeOnly]);

  useEffect(() => {
    fetchRegisters();
  }, [fetchRegisters]);

  return { registers, loading, refetch: fetchRegisters };
}

export function usePosShifts(eventId: string | null, registerId?: string | null) {
  const [shifts, setShifts] = useState<PosShift[]>([]);
  const [openShift, setOpenShift] = useState<PosShift | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchShifts = useCallback(async () => {
    if (!eventId) {
      setShifts([]);
      setOpenShift(null);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('pos_shifts')
        .select('*, register:pos_registers(*), opened_by:profiles!pos_shifts_opened_by_user_id_fkey(name, email), closed_by:profiles!pos_shifts_closed_by_user_id_fkey(name, email)')
        .eq('event_id', eventId)
        .order('opened_at', { ascending: false });

      if (registerId) {
        query = query.eq('register_id', registerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const shiftsData = (data || []) as unknown as PosShift[];
      setShifts(shiftsData);
      
      // Find open shift for selected register
      const open = registerId 
        ? shiftsData.find(s => s.status === 'OPEN' && s.register_id === registerId)
        : shiftsData.find(s => s.status === 'OPEN');
      setOpenShift(open || null);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, registerId]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  return { shifts, openShift, loading, refetch: fetchShifts };
}
