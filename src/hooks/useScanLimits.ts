
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export const useScanLimits = () => {
  const [dailyScansRemaining, setDailyScansRemaining] = useState<number | null>(3);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useSession();

  const fetchScanCount = async () => {
    try {
      setLoading(true);
      if (!user) {
        // If no user is logged in, default to 3 scans
        setDailyScansRemaining(3);
        setLoading(false);
        return;
      }

      // Get current date in user's timezone
      const now = new Date();
      
      // Create start of day in ISO format (midnight)
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfDayISO = startOfDay.toISOString();
      
      // Create end of day in ISO format (23:59:59.999)
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const endOfDayISO = endOfDay.toISOString();
      
      console.log(`Checking scans between: ${startOfDayISO} and ${endOfDayISO}`);
      
      const { count, error } = await supabase
        .from('style_analyses')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('scan_date', startOfDayISO)
        .lte('scan_date', endOfDayISO);

      if (error) {
        console.error('Error fetching scan count:', error);
        // Default to allowing scans on error
        setDailyScansRemaining(3);
      } else {
        // Calculate remaining scans (max 3)
        const remaining = Math.max(0, 3 - (count || 0));
        console.log(`Scans today: ${count}, Remaining: ${remaining}`);
        setDailyScansRemaining(remaining);
      }
    } catch (error) {
      console.error('Error in fetchScanCount:', error);
      // Default to allowing scans on error
      setDailyScansRemaining(3);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScanCount();
    
    // Set up a realtime subscription to update the count when new scans are added
    const channel = supabase
      .channel('style_analyses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'style_analyses',
          filter: user ? `user_id=eq.${user.id}` : undefined
        },
        () => {
          console.log('Style analysis changed, refreshing scan count');
          fetchScanCount();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    dailyScansRemaining,
    loading,
    refreshScanCount: fetchScanCount
  };
};
