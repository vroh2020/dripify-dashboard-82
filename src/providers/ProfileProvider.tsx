import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// ============================================================================
// Types & Interfaces
// ============================================================================

type DatabaseProfile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export interface UserProfile extends DatabaseProfile {
  // All fields already defined in Database type
}

interface ProfileState {
  // Data
  profile: UserProfile | null;
  
  // Loading States
  isLoading: boolean;
  isUpdating: boolean;
  isRefreshing: boolean;
  
  // Cache Metadata
  lastFetched: Date | null;
  lastUpdated: Date | null;
  
  // Error Handling
  error: string | null;
  
  // Optimistic Updates Queue
  pendingUpdates: Record<string, any>[];
}

interface ProfileActions {
  // Data Management
  fetchProfile: (userId?: string) => Promise<UserProfile | null>;
  updateProfile: (updates: Partial<UserProfile>, optimistic?: boolean) => Promise<boolean>;
  refreshProfile: () => Promise<UserProfile | null>;
  
  // Cache Management
  clearProfile: () => void;
  clearError: () => void;
  
  // Utility
  isProfileStale: () => boolean;
  getField: <K extends keyof UserProfile>(field: K) => UserProfile[K] | null;
  setField: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => Promise<boolean>;
}

type ProfileContextType = ProfileState & ProfileActions;

// ============================================================================
// Context Setup
// ============================================================================

const ProfileContext = createContext<ProfileContextType | null>(null);

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

// ============================================================================
// ProfileProvider Component
// ============================================================================

interface ProfileProviderProps {
  children: React.ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  // ============================================================================
  // Dependencies & State
  // ============================================================================
  
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [profileState, setProfileState] = useState<ProfileState>({
    profile: null,
    isLoading: false,
    isUpdating: false,
    isRefreshing: false,
    lastFetched: null,
    lastUpdated: null,
    error: null,
    pendingUpdates: [],
  });

  // ============================================================================
  // Refs for State Tracking
  // ============================================================================
  
  const mountedRef = useRef(true);
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Promise<any> | null>(null);

  // Cache settings
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 1000; // 1 second

  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  const updateProfileState = useCallback((updates: Partial<ProfileState>) => {
    if (!mountedRef.current) return;
    
    setProfileState(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const clearProfileState = useCallback(() => {
    updateProfileState({
      profile: null,
      isLoading: false,
      isUpdating: false,
      isRefreshing: false,
      lastFetched: null,
      lastUpdated: null,
      error: null,
      pendingUpdates: [],
    });
  }, [updateProfileState]);

  // ============================================================================
  // Core Profile Operations
  // ============================================================================
  
  const fetchProfile = useCallback(async (userId?: string): Promise<UserProfile | null> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId || !mountedRef.current) {
      return null;
    }

    updateProfileState({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist - create one
          const newProfile: ProfileInsert = {
            id: targetUserId,
            username: user?.email?.split('@')[0] || 'User',
            onboarding_completed: false,
            subscription_status: 'free',
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select('*')
            .single();

          if (createError) throw createError;
          
          const profile = createdProfile as UserProfile;
          updateProfileState({
            profile,
            isLoading: false,
            lastFetched: new Date(),
          });

          return profile;
        }
        throw error;
      }

      const profile = data as UserProfile;
      updateProfileState({
        profile,
        isLoading: false,
        lastFetched: new Date(),
        error: null,
      });

      return profile;
    } catch (error: any) {
      console.error('Profile fetch error:', error);
      updateProfileState({
        isLoading: false,
        error: error.message || 'Failed to fetch profile',
      });
      return null;
    }
  }, [user?.id, user?.email, updateProfileState]);

  const updateProfile = useCallback(async (
    updates: Partial<UserProfile>, 
    optimistic: boolean = true
  ): Promise<boolean> => {
    if (!user?.id || !mountedRef.current) {
      return false;
    }

    // Optimistic update
    if (optimistic && profileState.profile) {
      const optimisticProfile = { ...profileState.profile, ...updates };
      updateProfileState({
        profile: optimisticProfile,
        isUpdating: true,
        pendingUpdates: [...profileState.pendingUpdates, updates],
      });
    } else {
      updateProfileState({ isUpdating: true });
    }

    try {
      // Prepare updates for database (exclude readonly fields)
      const { id, created_at, ...updateData } = updates;
      const dbUpdates: ProfileUpdate = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      // Update with server data
      const profile = data as UserProfile;
      updateProfileState({
        profile,
        isUpdating: false,
        lastUpdated: new Date(),
        error: null,
        pendingUpdates: [], // Clear pending updates on success
      });

      return true;
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      // If optimistic update failed, revert to last known state
      if (optimistic) {
        await fetchProfile(user.id);
        toast({
          title: "Update Warning",
          description: "Some changes may not have been saved. Please try again.",
          variant: "destructive",
        });
      }

      updateProfileState({
        isUpdating: false,
        error: error.message || 'Failed to update profile',
        pendingUpdates: [], // Clear pending updates on error
      });

      return false;
    }
  }, [user?.id, profileState.profile, profileState.pendingUpdates, updateProfileState, fetchProfile, toast]);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user?.id || !mountedRef.current) {
      return null;
    }

    updateProfileState({ isRefreshing: true });
    const profile = await fetchProfile(user.id);
    updateProfileState({ isRefreshing: false });
    
    return profile;
  }, [user?.id, fetchProfile, updateProfileState]);

  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  const clearProfile = useCallback(() => {
    clearProfileState();
  }, [clearProfileState]);

  const clearError = useCallback(() => {
    updateProfileState({ error: null });
  }, [updateProfileState]);

  const isProfileStale = useCallback((): boolean => {
    if (!profileState.lastFetched) return true;
    
    const now = Date.now();
    const lastFetched = profileState.lastFetched.getTime();
    return (now - lastFetched) > CACHE_DURATION;
  }, [profileState.lastFetched]);

  const getField = useCallback(<K extends keyof UserProfile>(field: K): UserProfile[K] | null => {
    return profileState.profile?.[field] || null;
  }, [profileState.profile]);

  const setField = useCallback(async <K extends keyof UserProfile>(
    field: K, 
    value: UserProfile[K]
  ): Promise<boolean> => {
    return await updateProfile({ [field]: value } as Partial<UserProfile>);
  }, [updateProfile]);

  // ============================================================================
  // Auto Profile Management
  // ============================================================================
  
  // Auto-fetch profile when user changes
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      clearProfileState();
      return;
    }

    // Only fetch if we don't have a profile or it's stale
    if (!profileState.profile || isProfileStale()) {
      fetchProfile(user.id);
    }
  }, [isAuthenticated, user?.id, profileState.profile, isProfileStale, fetchProfile, clearProfileState]);

  // Auto-refresh stale profile
  useEffect(() => {
    if (!profileState.profile || !mountedRef.current) return;

    if (cacheTimeoutRef.current) {
      clearTimeout(cacheTimeoutRef.current);
    }

    cacheTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && user?.id) {
        console.log('🔄 Auto-refreshing stale profile');
        fetchProfile(user.id);
      }
    }, CACHE_DURATION);

    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, [profileState.profile, user?.id, fetchProfile]);

  // Process pending updates with retry logic
  useEffect(() => {
    if (profileState.pendingUpdates.length === 0 || pendingUpdatesRef.current) {
      return;
    }

    const processPendingUpdates = async () => {
      let attempts = 0;
      
      while (attempts < MAX_RETRY_ATTEMPTS && profileState.pendingUpdates.length > 0) {
        try {
          const updates = profileState.pendingUpdates[0];
          await updateProfile(updates, false); // No optimistic update for retries
          break; // Success
        } catch (error) {
          attempts++;
          if (attempts < MAX_RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
          }
        }
      }
    };

    pendingUpdatesRef.current = processPendingUpdates();
    pendingUpdatesRef.current.finally(() => {
      pendingUpdatesRef.current = null;
    });

  }, [profileState.pendingUpdates, updateProfile]);

  // ============================================================================
  // Cleanup
  // ============================================================================
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================
  
  const contextValue: ProfileContextType = {
    // State
    ...profileState,
    
    // Actions
    fetchProfile,
    updateProfile,
    refreshProfile,
    clearProfile,
    clearError,
    isProfileStale,
    getField,
    setField,
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export default ProfileProvider; 