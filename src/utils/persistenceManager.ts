import { Capacitor } from '@capacitor/core';

export interface OnboardingProgress {
  deviceId: string;
  currentStep: number;
  stepData: Record<string, unknown>;
  timestamp: number;
  completed: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  isNative: boolean;
}

class PersistenceManager {
  private static instance: PersistenceManager;
  private deviceInfo: DeviceInfo | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager();
    }
    return PersistenceManager.instance;
  }

  async initialize(): Promise<DeviceInfo> {
    if (this.isInitialized && this.deviceInfo) {
      return this.deviceInfo;
    }

    try {
      let deviceId: string;
      const isNative = Capacitor.isNativePlatform();
      let platform: 'ios' | 'android' | 'web' = 'web';

      if (isNative) {
        try {
          const { Device } = await import('@capacitor/device');
          const info = await Device.getId();
          deviceId = info.identifier;
          
          // Determine platform
          const platformInfo = await Device.getInfo();
          platform = platformInfo.platform as 'ios' | 'android';
          
          console.log('📱 Native device ID obtained:', deviceId, 'Platform:', platform);
        } catch (error) {
          console.warn('Failed to get native device ID, using fallback:', error);
          deviceId = this.generateFallbackId();
        }
      } else {
        // Web fallback with persistent ID
        deviceId = this.getOrCreateWebDeviceId();
        console.log('🌐 Web device ID:', deviceId);
      }

      this.deviceInfo = {
        deviceId,
        platform,
        isNative
      };

      this.isInitialized = true;
      return this.deviceInfo;
    } catch (error) {
      console.error('Error initializing persistence manager:', error);
      // Fallback
      const fallbackId = this.generateFallbackId();
      this.deviceInfo = {
        deviceId: fallbackId,
        platform: 'web',
        isNative: false
      };
      this.isInitialized = true;
      return this.deviceInfo;
    }
  }

  private generateFallbackId(): string {
    return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getOrCreateWebDeviceId(): string {
    const storageKey = 'dripify_device_id';
    try {
      let deviceId = localStorage.getItem(storageKey);
      if (!deviceId) {
        deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(storageKey, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error accessing localStorage for device ID:', error);
      return this.generateFallbackId();
    }
  }

  async saveOnboardingProgress(progress: Partial<OnboardingProgress>): Promise<void> {
    try {
      const deviceInfo = await this.initialize();
      
      const fullProgress: OnboardingProgress = {
        deviceId: deviceInfo.deviceId,
        currentStep: progress.currentStep || 0,
        stepData: progress.stepData || {},
        timestamp: Date.now(),
        completed: progress.completed || false
      };

      // Save to localStorage with error handling
      try {
        localStorage.setItem('dripify_onboarding_progress', JSON.stringify(fullProgress));
        console.log('✅ Onboarding progress saved to localStorage:', fullProgress);
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }

      // If completed, also save completion status
      if (fullProgress.completed) {
        try {
          localStorage.setItem('dripify_onboarding_completed', 'true');
          localStorage.removeItem('dripify_onboarding_progress'); // Clean up progress
          console.log('✅ Onboarding completion saved to localStorage');
        } catch (error) {
          console.error('Failed to save completion status:', error);
        }
      }
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  }

  async getOnboardingProgress(): Promise<OnboardingProgress | null> {
    try {
      const deviceInfo = await this.initialize();
      
      // Check localStorage first
      try {
        const cached = localStorage.getItem('dripify_onboarding_progress');
        if (cached) {
          const progress: OnboardingProgress = JSON.parse(cached);
          
          // Validate the progress is for this device and not too old
          if (progress.deviceId === deviceInfo.deviceId) {
            const age = Date.now() - progress.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (age < maxAge) {
              console.log('📊 Restored onboarding progress from localStorage:', progress);
              return progress;
            } else {
              console.log('📊 Onboarding progress too old, clearing:', age);
              this.clearOnboardingProgress();
            }
          }
        }
      } catch (error) {
        console.error('Error reading from localStorage:', error);
      }

      return null;
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      return null;
    }
  }

  async isOnboardingCompleted(): Promise<boolean> {
    try {
      // Check localStorage first
      try {
        const completed = localStorage.getItem('dripify_onboarding_completed');
        if (completed === 'true') {
          console.log('📊 Onboarding completion found in localStorage');
          return true;
        }
      } catch (error) {
        console.error('Error checking localStorage for completion:', error);
      }

      return false;
    } catch (error) {
      console.error('Error checking onboarding completion:', error);
      return false;
    }
  }

  async clearOnboardingProgress(): Promise<void> {
    try {
      localStorage.removeItem('dripify_onboarding_progress');
      localStorage.removeItem('dripify_onboarding_completed');
      console.log('🧹 Onboarding progress cleared from localStorage');
    } catch (error) {
      console.error('Error clearing onboarding progress:', error);
    }
  }

  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  // Method to handle app state changes without triggering refreshes
  async handleAppStateChange(): Promise<void> {
    try {
      const deviceInfo = await this.initialize();
      const progress = await this.getOnboardingProgress();
      
      if (progress && !progress.completed) {
        console.log('📱 App state change detected, progress preserved:', progress.currentStep);
        // Don't trigger reload, just log the state
      }
    } catch (error) {
      console.error('Error handling app state change:', error);
    }
  }
}

export const persistenceManager = PersistenceManager.getInstance();