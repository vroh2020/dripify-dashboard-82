
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { event_type, app_user_id, entitlement_id, product_id, expiration_at_ms } = await req.json()
    
    // Get RevenueCat API key from secrets
    const revenueCatKey = Deno.env.get('REVENUECAT_PUBLIC_KEY')
    if (!revenueCatKey) {
      throw new Error('RevenueCat API key not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different webhook events
    switch (event_type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        // Update user subscription status in database
        const expiryDate = expiration_at_ms ? new Date(expiration_at_ms).toISOString() : null
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_expiry: expiryDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', app_user_id)

        if (updateError) {
          console.error('Failed to update profile for subscription activation:', updateError)
          throw new Error('Database update failed')
        }
        
        console.log(`✅ Subscription activated for user: ${app_user_id}, expires: ${expiryDate}`)
        break
      
      case 'CANCELLATION':
      case 'EXPIRATION':
        // Handle subscription cancellation
        const { error: cancelError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'inactive',
            subscription_expiry: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', app_user_id)

        if (cancelError) {
          console.error('Failed to update profile for subscription cancellation:', cancelError)
          throw new Error('Database update failed')
        }
        
        console.log(`❌ Subscription cancelled for user: ${app_user_id}`)
        break

      default:
        console.log(`📝 Unhandled webhook event: ${event_type} for user: ${app_user_id}`)
    }

    return new Response(
      JSON.stringify({ received: true, event_type, app_user_id }),
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
