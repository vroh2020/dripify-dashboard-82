import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { sanitizeHtml } from '@/utils/validation';

interface UseSessionReturn {
  session: Session | null;
  user: User | null;
  userMetadata: Record<string, unknown> | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const updateSession = useCallback((session: Session | null) => {
    setSession(session);
    setUser(session?.user || null);
    setUserMetadata(session?.user?.user_metadata || null);
    setIsLoading(false);
    setInitialized(true);
  }, []);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
        updateSession(null);
        return;
      }
      updateSession(session);
    } catch (error) {
      console.error('Session refetch error:', error);
      updateSession(null);
    }
  }, [updateSession]);

  useEffect(() => {
    let mounted = true;

    // Get initial session with security improvements
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          updateSession(null);
          return;
        }
        
        if (session) {
          setSession(session);
          setUser(session?.user || null);
          
          // Sanitize user metadata to prevent XSS
          const metadata = session?.user?.user_metadata;
          if (metadata) {
            const sanitizedMetadata: Record<string, any> = {};
            Object.entries(metadata).forEach(([key, value]) => {
              if (typeof value === 'string') {
                sanitizedMetadata[key] = sanitizeHtml(value);
              } else {
                sanitizedMetadata[key] = value;
              }
            });
            setUserMetadata(sanitizedMetadata);
          } else {
            setUserMetadata(null);
          }
        } else {
          updateSession(null);
        }
        
        setIsLoading(false);
      } catch (error) {
        if (!mounted) return;
        console.error('Initial session error:', error);
        updateSession(null);
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event, session ? 'session exists' : 'no session');
      
      if (session) {
        setSession(session);
        setUser(session?.user || null);
        
        // Sanitize user metadata to prevent XSS
        const metadata = session?.user?.user_metadata;
        if (metadata) {
          const sanitizedMetadata: Record<string, any> = {};
          Object.entries(metadata).forEach(([key, value]) => {
            if (typeof value === 'string') {
              sanitizedMetadata[key] = sanitizeHtml(value);
            } else {
              sanitizedMetadata[key] = value;
            }
          });
          setUserMetadata(sanitizedMetadata);
        } else {
          setUserMetadata(null);
        }
      } else {
        updateSession(null);
      }
      
      setIsLoading(false);
    });

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateSession, initialized]);

  return { session, user, userMetadata, isLoading, refetch };
}
