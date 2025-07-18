// Utility function to test onboarding flow
export const testOnboardingFlow = () => {
  console.log('🧪 Testing onboarding flow...');
  
  // Test localStorage caching
  const cachedStatus = localStorage.getItem('dripify_onboarding_completed');
  console.log('📊 Cached onboarding status:', cachedStatus);
  
  // Test device ID
  const deviceId = localStorage.getItem('device_id') || 'no-device-id';
  console.log('📱 Device ID:', deviceId);
  
  // Test current URL
  console.log('🌐 Current URL:', window.location.href);
  console.log('📍 Current path:', window.location.pathname);
  
  // Test if we're in onboarding
  const isInOnboarding = window.location.pathname.includes('/onboarding');
  console.log('🎯 In onboarding flow:', isInOnboarding);
  
  return {
    cachedStatus,
    deviceId,
    currentUrl: window.location.href,
    currentPath: window.location.pathname,
    isInOnboarding
  };
};

// Function to reset onboarding for testing
export const resetOnboardingForTesting = () => {
  console.log('🔄 Resetting onboarding for testing...');
  localStorage.removeItem('dripify_onboarding_completed');
  localStorage.removeItem('device_id');
  console.log('✅ Onboarding reset complete');
  window.location.reload();
};

// Function to simulate onboarding completion
export const simulateOnboardingCompletion = () => {
  console.log('✅ Simulating onboarding completion...');
  localStorage.setItem('dripify_onboarding_completed', 'true');
  console.log('✅ Onboarding completion simulated');
  window.location.href = '/dashboard';
};

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).testOnboardingFlow = testOnboardingFlow;
  (window as any).resetOnboardingForTesting = resetOnboardingForTesting;
  (window as any).simulateOnboardingCompletion = simulateOnboardingCompletion;
}