// Test script for onboarding and payment services
// Run this in your browser console to test the services

// Test onboarding service
async function testOnboardingService() {
  console.log('🧪 Testing Onboarding Service...');
  
  // Mock user ID for testing
  const testUserId = 'test-user-id';
  
  try {
    // Test vibe selection
    console.log('📝 Testing vibe selection...');
    const vibeResult = await onboardingService.saveVibeSelection(testUserId, 'streetwear');
    console.log('✅ Vibe selection result:', vibeResult);
    
    // Test photo analysis
    console.log('📸 Testing photo analysis...');
    const analysisResult = await onboardingService.savePhotoAnalysis(testUserId, 'test-image-url', {
      overallScore: 85,
      breakdown: [
        { category: 'Aura', score: 90, emoji: '✨' },
        { category: 'Fit', score: 80, emoji: '🧥' }
      ]
    });
    console.log('✅ Photo analysis result:', analysisResult);
    
    // Test onboarding completion
    console.log('🎯 Testing onboarding completion...');
    const completionResult = await onboardingService.completeOnboarding(testUserId);
    console.log('✅ Onboarding completion result:', completionResult);
    
    console.log('🎉 All onboarding tests passed!');
  } catch (error) {
    console.error('❌ Onboarding test failed:', error);
  }
}

// Test payment service
async function testPaymentService() {
  console.log('🧪 Testing Payment Service...');
  
  // Mock user ID for testing
  const testUserId = 'test-user-id';
  
  try {
    // Test initialization
    console.log('🔧 Testing initialization...');
    const initResult = await paymentService.initializeRevenueCat();
    console.log('✅ Initialization result:', initResult);
    
    // Test subscription status
    console.log('📊 Testing subscription status...');
    const statusResult = await paymentService.getSubscriptionStatus(testUserId);
    console.log('✅ Subscription status result:', statusResult);
    
    console.log('🎉 All payment tests passed!');
  } catch (error) {
    console.error('❌ Payment test failed:', error);
  }
}

// Run tests
console.log('🚀 Starting service tests...');
testOnboardingService().then(() => {
  testPaymentService();
});

// Export for manual testing
window.testOnboardingService = testOnboardingService;
window.testPaymentService = testPaymentService; 