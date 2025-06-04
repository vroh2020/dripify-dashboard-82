
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { event_type, app_user_id } = await req.json()
    
    // Get RevenueCat API key from secrets
    const revenueCatKey = Deno.env.get('REVENUECAT_PUBLIC_KEY')
    if (!revenueCatKey) {
      throw new Error('RevenueCat API key not configured')
    }

    // Handle different webhook events
    switch (event_type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        // Update user subscription status in database
        // This is more secure than client-side updates
        console.log(`Subscription activated for user: ${app_user_id}`)
        break
      
      case 'CANCELLATION':
      case 'EXPIRATION':
        // Handle subscription cancellation
        console.log(`Subscription cancelled for user: ${app_user_id}`)
        break
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('RevenueCat webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
