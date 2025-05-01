
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// This function returns the RevenueCat public API key
// The actual key should be set in Supabase secrets with: supabase secrets set REVENUECAT_PUBLIC_KEY=your_api_key
serve(async (req) => {
  try {
    // Get the API key from the environment
    const publicKey = Deno.env.get('REVENUECAT_PUBLIC_KEY') || 'appl_YWYCyRvMoDlPPLYdeRWDIyZadYs';
    
    // Return the public key
    return new Response(
      JSON.stringify({
        publicKey,
        message: 'RevenueCat configuration retrieved successfully'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
        message: 'Failed to retrieve RevenueCat configuration'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
