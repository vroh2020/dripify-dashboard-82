import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/utils/device';

const TABLE = 'temp_onboard_users';

export interface OnboardingData {
  device_id: string;
  selfie_url?: string;
  style_choice?: string;
  preferences?: Record<string, unknown>;
  onboarding_complete: boolean;
  subscription_active: boolean;
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  // Fetch onboarding state for this device
  const {
    data: onboarding,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const device_id = await getDeviceId();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('device_id', device_id)
        .maybeSingle();
      if (error) throw error;
      return data as OnboardingData | null;
    }
  });

  // Save/update onboarding step
  const saveOnboarding = useMutation({
    mutationFn: async (updates: Partial<OnboardingData>) => {
      const device_id = await getDeviceId();
      const { error } = await supabase
        .from(TABLE)
        .upsert({ device_id, ...updates }, { onConflict: 'device_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding'] })
  });

  // Reset onboarding (delete row)
  const resetOnboarding = useMutation({
    mutationFn: async () => {
      const device_id = await getDeviceId();
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq('device_id', device_id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding'] })
  });

  return {
    onboarding,
    isLoading,
    isError,
    refetch,
    saveOnboarding,
    resetOnboarding
  };
}