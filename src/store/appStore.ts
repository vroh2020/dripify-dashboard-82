import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// Core types
export interface User {
  id: string;
  email?: string;
  isAnonymous: boolean;
  deviceId: string;
}

export interface OnboardingData {
  heard_about?: string;
  age_range?: string;
  gender?: string;
  style_goal?: string;
  clothing_category?: string;
  budget?: string;
  favorite_brands?: string[];
  color_preference?: string;
  occasions?: string[];
  weekly_reports?: boolean;
  instant_suggestions?: boolean;
  color_palette?: string;
  shop_frequency?: string;
  selfie_url?: string;
}

export interface SubscriptionState {
  isActive: boolean;
  productId: string | null;
  expirationDate: Date | null;
  isLoading: boolean;
}

export interface AppState {
  // User State
  user: User | null;
  isAuthenticated: boolean;
  
  // Onboarding State
  onboardingCompleted: boolean;
  onboardingData: OnboardingData;
  currentOnboardingStep: number;
  
  // Subscription State
  subscription: SubscriptionState;
  
  // App State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
  setCurrentStep: (step: number) => void;
  setSubscription: (subscription: Partial<SubscriptionState>) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  reset: () => void;
}

// Generate device ID
const generateDeviceId = (): string => {
  const stored = localStorage.getItem('dripify_device_id');
  if (stored) return stored;
  
  const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('dripify_device_id', newId);
  return newId;
};

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  onboardingCompleted: false,
  onboardingData: {},
  currentOnboardingStep: 0,
  subscription: {
    isActive: false,
    productId: null,
    expirationDate: null,
    isLoading: false,
  },
  isInitialized: false,
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      
      updateOnboardingData: (data) => set((state) => ({
        onboardingData: { ...state.onboardingData, ...data }
      })),
      
      setCurrentStep: (step) => set({ currentOnboardingStep: step }),
      
      setSubscription: (subscriptionUpdate) => set((state) => ({
        subscription: { ...state.subscription, ...subscriptionUpdate }
      })),
      
      setError: (error) => set({ error }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      initialize: async () => {
        const state = get();
        if (state.isInitialized) return;
        
        try {
          set({ isLoading: true, error: null });
          
          // Generate/get device ID
          const deviceId = generateDeviceId();
          console.log('📱 Device ID:', deviceId);
          
          // Check for existing user session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.warn('Session check error:', sessionError);
          }
          
          let user: User | null = null;
          let onboardingCompleted = false;
          
          if (session?.user) {
            // Authenticated user
            user = {
              id: session.user.id,
              email: session.user.email,
              isAnonymous: false,
              deviceId
            };
            
            // Check onboarding status for authenticated user
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', session.user.id)
              .single();
              
            onboardingCompleted = profile?.onboarding_completed || false;
            
          } else {
            // Anonymous user
            user = {
              id: deviceId,
              isAnonymous: true,
              deviceId
            };
            
            // Check onboarding status for anonymous user
            const { data: tempUser } = await supabase
              .from('temp_onboard_users')
              .select('completed')
              .eq('device_id', deviceId)
              .single();
              
            onboardingCompleted = tempUser?.completed || false;
          }
          
          console.log('🔍 Initialization complete:', {
            user: user?.id,
            isAnonymous: user?.isAnonymous,
            onboardingCompleted
          });
          
          set({
            user,
            isAuthenticated: !!user,
            onboardingCompleted,
            isInitialized: true,
            isLoading: false
          });
          
        } catch (error) {
          console.error('❌ App initialization failed:', error);
          
          // Fallback to anonymous user
          const deviceId = generateDeviceId();
          const fallbackUser: User = {
            id: deviceId,
            isAnonymous: true,
            deviceId
          };
          
          set({
            user: fallbackUser,
            isAuthenticated: true,
            onboardingCompleted: false,
            isInitialized: true,
            isLoading: false,
            error: 'Initialization failed, using offline mode'
          });
        }
      },
      
      reset: () => {
        localStorage.removeItem('dripify_device_id');
        localStorage.removeItem('dripify-app-store');
        set(initialState);
      }
    }),
    {
      name: 'dripify-app-store',
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
        onboardingData: state.onboardingData,
        currentOnboardingStep: state.currentOnboardingStep,
      }),
    }
  )
);