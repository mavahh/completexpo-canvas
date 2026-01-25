import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface EditSession {
  id: string;
  user_id: string;
  last_seen_at: string;
  user_name?: string;
  user_email?: string;
}

interface UseEditSessionProps {
  floorplanId: string | null;
  canEdit: boolean;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SESSION_TIMEOUT = 120000; // 2 minutes

export function useEditSession({ floorplanId, canEdit }: UseEditSessionProps) {
  const { user } = useAuth();
  const [otherEditors, setOtherEditors] = useState<EditSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Create/update session
  const updateSession = useCallback(async () => {
    if (!floorplanId || !user || !canEdit) return;

    try {
      const { data, error } = await supabase
        .from('floorplan_edit_sessions')
        .upsert({
          floorplan_id: floorplanId,
          user_id: user.id,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'floorplan_id,user_id',
        })
        .select('id')
        .single();

      if (!error && data) {
        setSessionId(data.id);
      }
    } catch (error) {
      console.error('Failed to update edit session:', error);
    }
  }, [floorplanId, user, canEdit]);

  // Fetch other editors
  const fetchOtherEditors = useCallback(async () => {
    if (!floorplanId || !user) return;

    try {
      const cutoff = new Date(Date.now() - SESSION_TIMEOUT).toISOString();
      
      const { data: sessions } = await supabase
        .from('floorplan_edit_sessions')
        .select('id, user_id, last_seen_at')
        .eq('floorplan_id', floorplanId)
        .neq('user_id', user.id)
        .gte('last_seen_at', cutoff);

      if (!sessions || sessions.length === 0) {
        setOtherEditors([]);
        return;
      }

      // Fetch user profiles
      const userIds = sessions.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedSessions: EditSession[] = sessions.map(s => ({
        id: s.id,
        user_id: s.user_id,
        last_seen_at: s.last_seen_at,
        user_name: profileMap.get(s.user_id)?.name || undefined,
        user_email: profileMap.get(s.user_id)?.email || undefined,
      }));

      setOtherEditors(enrichedSessions);
    } catch (error) {
      console.error('Failed to fetch other editors:', error);
    }
  }, [floorplanId, user]);

  // Cleanup session on unmount
  const cleanupSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      await supabase
        .from('floorplan_edit_sessions')
        .delete()
        .eq('id', sessionId);
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  }, [sessionId]);

  // Start heartbeat when entering edit mode
  useEffect(() => {
    if (!floorplanId || !canEdit || !user) return;

    // Initial session creation
    updateSession();
    fetchOtherEditors();

    // Set up heartbeat
    heartbeatRef.current = setInterval(() => {
      updateSession();
      fetchOtherEditors();
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      cleanupSession();
    };
  }, [floorplanId, canEdit, user, updateSession, fetchOtherEditors, cleanupSession]);

  // Get display names for other editors
  const otherEditorNames = otherEditors.map(e => 
    e.user_name || e.user_email?.split('@')[0] || 'Onbekend'
  );

  return {
    otherEditors,
    otherEditorNames,
    hasOtherEditors: otherEditors.length > 0,
  };
}
