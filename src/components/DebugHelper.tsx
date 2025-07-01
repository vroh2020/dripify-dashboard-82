import { useEffect, useState } from 'react';
import { useAuthState } from '@/hooks/useAuthState';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface DebugInfo {
  platform: string;
  isNative: boolean;
  authState: any;
  onboardingState: any;
  url: string;
  timestamp: string;
}

export const DebugHelper = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const authState = useAuthState();
  const onboardingState = useOnboardingStatus();

  // Show debug helper on triple tap (production debugging)
  useEffect(() => {
    let tapCount = 0;
    let tapTimer: NodeJS.Timeout;

    const handleTripleTap = () => {
      tapCount++;
      clearTimeout(tapTimer);
      
      if (tapCount === 3) {
        setIsVisible(true);
        collectDebugInfo();
        tapCount = 0;
      } else {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 1000);
      }
    };

    // Listen for triple tap on header (where app title is)
    const header = document.querySelector('h1');
    if (header) {
      header.addEventListener('click', handleTripleTap);
      return () => header.removeEventListener('click', handleTripleTap);
    }
  }, []);

  const collectDebugInfo = () => {
    setDebugInfo({
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      authState: {
        isLoading: authState.isLoading,
        isAuthenticated: authState.isAuthenticated,
        hasUser: !!authState.user,
        hasSession: !!authState.session,
        error: authState.error
      },
      onboardingState: {
        isLoading: onboardingState.isLoading,
        hasCompleted: onboardingState.hasCompletedOnboarding
      },
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  };

  const handleForceAuthRefresh = () => {
    console.log('🔄 Forcing auth refresh...');
    authState.forceRefresh();
  };

  const handleForceReload = () => {
    console.log('🔄 Force reloading app...');
    window.location.reload();
  };

  const handleCloseBrowser = async () => {
    try {
      await Browser.close();
      console.log('🚪 Browser closed manually');
    } catch (error) {
      console.log('Browser close failed:', error);
    }
  };

  const handleClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 Storage cleared');
    window.location.reload();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-lg">Debug Helper</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsVisible(false)}
            className="w-fit"
          >
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {debugInfo && (
            <div className="text-xs space-y-2">
              <div><strong>Platform:</strong> {debugInfo.platform}</div>
              <div><strong>Native:</strong> {String(debugInfo.isNative)}</div>
              <div><strong>URL:</strong> {debugInfo.url}</div>
              <div><strong>Auth Loading:</strong> {String(debugInfo.authState.isLoading)}</div>
              <div><strong>Authenticated:</strong> {String(debugInfo.authState.isAuthenticated)}</div>
              <div><strong>Has User:</strong> {String(debugInfo.authState.hasUser)}</div>
              <div><strong>Auth Error:</strong> {debugInfo.authState.error || 'None'}</div>
              <div><strong>Onboarding Loading:</strong> {String(debugInfo.onboardingState.isLoading)}</div>
              <div><strong>Onboarding Complete:</strong> {String(debugInfo.onboardingState.hasCompleted)}</div>
              <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
            </div>
          )}
          
          <div className="space-y-2">
            <Button onClick={collectDebugInfo} variant="outline" size="sm" className="w-full">
              Refresh Debug Info
            </Button>
            <Button onClick={handleForceAuthRefresh} variant="outline" size="sm" className="w-full">
              Force Auth Refresh
            </Button>
            <Button onClick={handleCloseBrowser} variant="outline" size="sm" className="w-full">
              Close Browser
            </Button>
            <Button onClick={handleForceReload} variant="outline" size="sm" className="w-full">
              Force Reload App
            </Button>
            <Button onClick={handleClearStorage} variant="destructive" size="sm" className="w-full">
              Clear Storage & Reload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 