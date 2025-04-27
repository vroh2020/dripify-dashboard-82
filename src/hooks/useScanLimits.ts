
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

      const { count, error } = await supabase
        .from('style_analyses')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('scan_date', new Date().toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching scan count:', error);
        // Default to allowing scans on error
        setDailyScansRemaining(3);
      } else {
        // Calculate remaining scans (max 3)
        setDailyScansRemaining(3 - (count || 0));
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
  }, [user]);

  return {
    dailyScansRemaining,
    loading,
    refreshScanCount: fetchScanCount
  };
};
