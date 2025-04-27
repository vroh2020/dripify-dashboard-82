
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useScanLimits = () => {
  const [dailyScansRemaining, setDailyScansRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchScanCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('style_analyses')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('scan_date', new Date().toISOString().split('T')[0]);

      if (error) throw error;
      
      setDailyScansRemaining(3 - (count || 0));
    } catch (error) {
      console.error('Error fetching scan count:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScanCount();
  }, []);

  return {
    dailyScansRemaining,
    loading,
    refreshScanCount: fetchScanCount
  };
};
