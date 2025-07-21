import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';

export const debugRevenueCatSetup = async () => {
  console.log('🔍 === REVENUECAT DEBUG START ===');
  
  // Check platform
  console.log('📱 Platform:', Capacitor.isNativePlatform() ? 'Native' : 'Web');
  
  if (!Capacitor.isNativePlatform()) {
    console.log('🌐 Web platform detected - skipping native checks');
    return;
  }

  try {
    // Check if RevenueCat is available
    console.log('🔧 Checking RevenueCat availability...');
    
    // Test basic RevenueCat functionality
    console.log('📊 Getting customer info...');
    const { customerInfo } = await Purchases.getCustomerInfo();
    console.log('✅ Customer info retrieved:', {
      originalAppUserId: customerInfo.originalAppUserId,
      entitlements: Object.keys(customerInfo.entitlements.active || {}),
      latestExpirationDate: customerInfo.latestExpirationDate
    });

    // Test offerings fetch
    console.log('📦 Testing offerings fetch...');
    const offeringsData = await Purchases.getOfferings();
    const offeringsArray = Object.values(offeringsData.all || {});
    
    // CRITICAL: Check if offerings.current is nil
    if (offeringsData.current) {
      console.log('✅ Offerings.current is available:', {
        identifier: offeringsData.current.identifier,
        packages: offeringsData.current.availablePackages.length
      });
      offeringsData.current.availablePackages.forEach(pkg => {
        console.log(`  📦 Current offering package: ${pkg.identifier} -> ${pkg.product.identifier}`);
      });
    } else {
      console.error('❌ CRITICAL: offerings.current is nil!');
      console.error('🔍 This is the main issue - no current offering is set');
      console.error('🔍 Check your RevenueCat dashboard:');
      console.error('   - Go to Products > Offerings');
      console.error('   - Make sure you have a "Current" offering set');
      console.error('   - Or set offering_1 as the current offering');
    }
    
    console.log('📊 Offerings summary:', {
      current: offeringsData.current?.identifier || 'none',
      all: offeringsArray.length,
      expectedProduct: REVENUECAT_CONFIG.products.monthly
    });

    if (offeringsArray.length === 0) {
      console.error('❌ NO OFFERINGS FOUND! This indicates:');
      console.error('   - Products not configured in App Store Connect');
      console.error('   - RevenueCat not linked to App Store Connect');
      console.error('   - API key issues');
      console.error('   - Bundle ID mismatch');
    } else {
      offeringsArray.forEach(offering => {
        console.log(`📦 Offering: ${offering.identifier}`);
        offering.availablePackages.forEach(pkg => {
          console.log(`  📦 Package: ${pkg.identifier}`);
          console.log(`    Product: ${pkg.product.identifier}`);
          console.log(`    Price: ${pkg.product.priceString}`);
          console.log(`    Type: ${pkg.packageType}`);
        });
      });
    }

    // Check for expected products
    const expectedProducts = Object.values(REVENUECAT_CONFIG.products);
    console.log('🎯 Expected products:', expectedProducts);
    
    const foundProducts = offeringsArray
      .flatMap(o => o.availablePackages)
      .map(p => p.product.identifier);
    
    console.log('🔍 Found products:', foundProducts);
    
    const missingProducts = expectedProducts.filter(p => !foundProducts.includes(p));
    if (missingProducts.length > 0) {
      console.error('❌ Missing products:', missingProducts);
    } else {
      console.log('✅ All expected products found!');
    }

  } catch (error) {
    console.error('❌ RevenueCat debug failed:', error);
  }
  
  console.log('🔍 === REVENUECAT DEBUG END ===');
};

export const validateRevenueCatConfig = () => {
  console.log('🔧 === REVENUECAT CONFIG VALIDATION ===');
  console.log('Config:', REVENUECAT_CONFIG);
  
  // Validate required fields
  const required = ['ENTITLEMENT_IDENTIFIER', 'offering', 'packages', 'products'];
  required.forEach(field => {
    if (!REVENUECAT_CONFIG[field as keyof typeof REVENUECAT_CONFIG]) {
      console.error(`❌ Missing required config: ${field}`);
    } else {
      console.log(`✅ ${field}:`, REVENUECAT_CONFIG[field as keyof typeof REVENUECAT_CONFIG]);
    }
  });
  
  console.log('🔧 === CONFIG VALIDATION END ===');
}; 