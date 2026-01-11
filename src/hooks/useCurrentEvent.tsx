import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface CurrentEventContextType {
  eventId: string | null;
  eventName: string | null;
  eventLocation: string | null;
  setCurrentEvent: (id: string | null, name?: string | null, location?: string | null) => void;
}

const CurrentEventContext = createContext<CurrentEventContextType | undefined>(undefined);

export function CurrentEventProvider({ children }: { children: ReactNode }) {
  const [eventId, setEventId] = useState<string | null>(() => {
    return localStorage.getItem('currentEventId');
  });
  const [eventName, setEventName] = useState<string | null>(() => {
    return localStorage.getItem('currentEventName');
  });
  const [eventLocation, setEventLocation] = useState<string | null>(() => {
    return localStorage.getItem('currentEventLocation');
  });

  const location = useLocation();

  // Auto-detect event from URL
  useEffect(() => {
    const pathMatch = location.pathname.match(/\/events\/([^\/]+)/);
    const urlEventId = pathMatch?.[1];
    
    if (urlEventId && urlEventId !== 'new' && urlEventId !== eventId) {
      // Fetch event details
      supabase
        .from('events')
        .select('id, name, location')
        .eq('id', urlEventId)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentEvent(data.id, data.name, data.location);
          }
        });
    }
  }, [location.pathname]);

  const setCurrentEvent = (id: string | null, name?: string | null, loc?: string | null) => {
    setEventId(id);
    setEventName(name ?? null);
    setEventLocation(loc ?? null);

    if (id) {
      localStorage.setItem('currentEventId', id);
      if (name) localStorage.setItem('currentEventName', name);
      if (loc) localStorage.setItem('currentEventLocation', loc);
    } else {
      localStorage.removeItem('currentEventId');
      localStorage.removeItem('currentEventName');
      localStorage.removeItem('currentEventLocation');
    }
  };

  return (
    <CurrentEventContext.Provider value={{ eventId, eventName, eventLocation, setCurrentEvent }}>
      {children}
    </CurrentEventContext.Provider>
  );
}

export function useCurrentEvent() {
  const context = useContext(CurrentEventContext);
  if (context === undefined) {
    throw new Error('useCurrentEvent must be used within a CurrentEventProvider');
  }
  return context;
}
