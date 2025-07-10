// Debug utilities for troubleshooting routing issues

export const debugAppState = () => {
  // This function can be called from browser console to debug app state
  console.log('🔍 Debug App State:');
  
  // Check localStorage
  console.log('📦 localStorage:', {
    hasAuthData: !!localStorage.getItem('supabase.auth.token'),
    authToken: localStorage.getItem('supabase.auth.token') ? 'PRESENT' : 'MISSING'
  });
  
  // Check sessionStorage
  console.log('📦 sessionStorage:', {
    hasAuthData: !!sessionStorage.getItem('supabase.auth.token'),
    authToken: sessionStorage.getItem('supabase.auth.token') ? 'PRESENT' : 'MISSING'
  });
  
  // Check current URL
  console.log('🌐 Current URL:', window.location.href);
  
  // Check if we're in a loading state
  const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"]');
  console.log('⏳ Loading elements found:', loadingElements.length);
  
  return {
    localStorage: !!localStorage.getItem('supabase.auth.token'),
    sessionStorage: !!sessionStorage.getItem('supabase.auth.token'),
    currentUrl: window.location.href,
    loadingElements: loadingElements.length
  };
};

export const forceRedirect = (path: string) => {
  console.log(`🔄 Force redirecting to: ${path}`);
  window.location.href = path;
};

export const clearAllStorage = () => {
  console.log('🧹 Clearing all storage...');
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Storage cleared');
};

// Add to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).debugAppState = debugAppState;
  (window as any).forceRedirect = forceRedirect;
  (window as any).clearAllStorage = clearAllStorage;
}