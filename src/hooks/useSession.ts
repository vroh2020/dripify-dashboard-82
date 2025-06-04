
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { sanitizeHtml } from '@/utils/validation';

interface UseSessionReturn {
  session: Session | null;
  user: User | null;
  userMetadata: Record<string, any> | null;
  isLoading: boolean;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, userMetadata, isLoading };
}
