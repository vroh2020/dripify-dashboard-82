import React from 'react'
import { useRevenueCatSimple } from '../hooks/useRevenueCatSimple'

export const RevenueCatSimpleTest: React.FC = () => {
  const {
    isConfigured,
    isLoading,
    error,
    customerInfo,
    offerings,
    purchasePackage,
    restorePurchases,
    hasActiveSubscription
  } = useRevenueCatSimple()

  const handlePurchase = async () => {
    const availablePackages = offerings?.availablePackages || []
    const packageToPurchase = availablePackages[0] // Just use first available package
    
    if (!packageToPurchase) {
      alert('No packages available')
      return
    }

    try {
      await purchasePackage(packageToPurchase)
      alert('Purchase successful! 🎉')
    } catch (err) {
      alert('Purchase failed')
    }
  }

  const handleRestore = async () => {
    try {
      await restorePurchases()
      alert('Purchases restored! 🎉')
    } catch (err) {
      alert('Restore failed')
    }
  }

  const availablePackages = offerings?.availablePackages || []
  const selectedPackage = availablePackages[0]

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>🎯 RevenueCat Simple Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Status</h3>
        <p>Configured: {isConfigured ? '✅' : '❌'}</p>
        <p>Loading: {isLoading ? '⏳' : '✅'}</p>
        <p>Has Pro: {hasActiveSubscription() ? '✅ PRO' : '❌ FREE'}</p>
        <p>User ID: {customerInfo?.originalAppUserId || 'Loading...'}</p>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Customer Info</h3>
        <pre style={{ fontSize: '12px', background: '#f0f0f0', padding: '10px' }}>
          {customerInfo ? JSON.stringify({
            activeSubscriptions: customerInfo.activeSubscriptions,
            allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
            firstSeen: customerInfo.firstSeen,
          }, null, 2) : 'Loading...'}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Offerings</h3>
        <pre style={{ fontSize: '12px', background: '#f0f0f0', padding: '10px' }}>
          {offerings ? JSON.stringify({
            identifier: offerings.identifier,
            serverDescription: offerings.serverDescription,
            packagesCount: availablePackages.length,
            selectedPackage: selectedPackage ? {
              identifier: selectedPackage.identifier,
              product: {
                identifier: selectedPackage.product.identifier,
                title: selectedPackage.product.title,
                priceString: selectedPackage.product.priceString
              }
            } : null
          }, null, 2) : 'Loading...'}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Available Packages</h3>
        <div style={{ marginBottom: '10px' }}>
          {availablePackages.map((pkg, index) => (
            <div key={pkg.identifier} style={{ 
              padding: '8px', 
              margin: '4px 0', 
              border: index === 0 ? '2px solid #007AFF' : '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <strong>{pkg.identifier}</strong> - {pkg.product.title} ({pkg.product.priceString})
            </div>
          ))}
          {availablePackages.length === 0 && <p>No packages available</p>}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Actions</h3>
        <button 
          onClick={handlePurchase}
          disabled={!selectedPackage || isLoading}
          style={{ 
            padding: '10px 20px', 
            margin: '5px',
            backgroundColor: selectedPackage ? '#007AFF' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Buy {selectedPackage?.identifier || 'Package'} ({selectedPackage?.product.priceString || 'Loading...'})
        </button>
        
        <button 
          onClick={handleRestore}
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            margin: '5px',
            backgroundColor: '#34C759',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Restore Purchases
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>This is a simple RevenueCat test component following official documentation.</p>
        <p>Check browser console for detailed logs.</p>
        <p>Based on: <a href="https://github.com/RevenueCat/purchases-capacitor" target="_blank">RevenueCat Capacitor Plugin</a></p>
      </div>
    </div>
  )
} 