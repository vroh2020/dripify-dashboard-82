import React from 'react'
import { useRevenueCat } from '../hooks/useRevenueCat'
import { useAuthState } from '../hooks/useAuthState'

export const RevenueCatTest: React.FC = () => {
  const { user } = useAuthState()
  const userId = user?.id || 'test-user-123'
  
  const {
    isInitialized,
    isLoading,
    customerInfo,
    error,
    isPro,
    purchase,
    restore,
    getAvailableProductTypes
  } = useRevenueCat(userId)

  const availableProducts = getAvailableProductTypes()

  const handlePurchase = async (type: "lifetime" | "monthly" | "annually") => {
    try {
      const result = await purchase(type)
      alert(`Purchase successful! 🎉 Pro status: ${result.success}`)
    } catch (err: any) {
      alert(`Purchase failed: ${err.message}`)
    }
  }

  const handleRestore = async () => {
    try {
      await restore()
      alert('Purchases restored! 🎉')
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>🚀 RevenueCat Comprehensive Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Status</h3>
        <p>User ID: {userId}</p>
        <p>iOS Only: {navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? '✅' : '❌'}</p>
        <p>Initialized: {isInitialized ? '✅' : '❌'}</p>
        <p>Loading: {isLoading ? '⏳' : '✅'}</p>
        <p>Pro Status: {isPro ? '✅ PRO' : '❌ FREE'}</p>
        {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Available Products</h3>
        <p>Available: {availableProducts.join(', ') || 'None configured'}</p>
        <p>Note: Only products with configured IDs will show up</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Customer Info</h3>
        <pre style={{ fontSize: '12px', background: '#f0f0f0', padding: '10px', maxHeight: '200px', overflow: 'auto' }}>
          {customerInfo ? JSON.stringify({
            originalAppUserId: customerInfo.customerInfo?.originalAppUserId,
            activeSubscriptions: customerInfo.customerInfo?.activeSubscriptions,
            allPurchasedProductIdentifiers: customerInfo.customerInfo?.allPurchasedProductIdentifiers,
            entitlements: customerInfo.customerInfo?.entitlements?.active,
            firstSeen: customerInfo.customerInfo?.firstSeen,
          }, null, 2) : 'Loading...'}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Actions</h3>
        
        {/* Monthly Purchase - Only show if available */}
        {availableProducts.includes('monthly') && (
          <button 
            onClick={() => handlePurchase('monthly')}
            disabled={isLoading}
            style={{ 
              padding: '10px 20px', 
              margin: '5px',
              backgroundColor: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            Buy Monthly Subscription ($12.99/month)
          </button>
        )}

        {/* Lifetime Purchase - Show with disabled state if not configured */}
        <button 
          onClick={() => handlePurchase('lifetime')}
          disabled={isLoading || !availableProducts.includes('lifetime')}
          style={{ 
            padding: '10px 20px', 
            margin: '5px',
            backgroundColor: availableProducts.includes('lifetime') ? '#34C759' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Buy Lifetime {!availableProducts.includes('lifetime') && '(Not Configured)'}
        </button>

        {/* Annual Purchase - Show with disabled state if not configured */}
        <button 
          onClick={() => handlePurchase('annually')}
          disabled={isLoading || !availableProducts.includes('annually')}
          style={{ 
            padding: '10px 20px', 
            margin: '5px',
            backgroundColor: availableProducts.includes('annually') ? '#FF9500' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Buy Annual {!availableProducts.includes('annually') && '(Not Configured)'}
        </button>
        
        <br />

        <button 
          onClick={handleRestore}
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            margin: '5px',
            backgroundColor: '#5856D6',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Restore Purchases
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>🎯 This is your comprehensive RevenueCat implementation!</p>
        <p>✅ iOS-only configuration</p>
        <p>✅ Direct product purchase approach (like your original)</p>
        <p>✅ Smart product validation</p>
        <p>✅ Entitlements-based Pro checking</p>
        <p>✅ Currently supports: Monthly subscription only</p>
        <p>⏳ TODO: Add Lifetime and Annual product IDs to config</p>
      </div>
    </div>
  )
} 