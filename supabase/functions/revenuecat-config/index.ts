import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// This endpoint provides the public RevenueCat API key to the client
// This is a safer approach than embedding it directly in the client code

serve(async (req) => {
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get RevenueCat API key from environment variables
    const publicKey = Deno.env.get('REVENUECAT_PUBLIC_KEY')

    if (!publicKey) {
      console.log('RevenueCat public key not configured - development mode')
      return new Response(
        JSON.stringify({
          publicKey: '',
          developmentMode: true
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      )
    }

    // Return the public key
    return new Response(
      JSON.stringify({
        publicKey,
        developmentMode: false
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in revenuecat-config function:', error)
    
    return new Response(
      JSON.stringify({ error: 'Failed to get RevenueCat configuration' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    )
  }
})
