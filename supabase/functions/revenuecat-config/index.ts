
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publicKey = Deno.env.get('REVENUECAT_PUBLIC_KEY');
    const isDevelopment = !publicKey || publicKey.trim() === '';

    console.log('RevenueCat config requested:', {
      hasPuplicKey: !!publicKey,
      isDevelopment
    });

    return new Response(JSON.stringify({
      publicKey: publicKey || null,
      developmentMode: isDevelopment,
      configured: !isDevelopment
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('RevenueCat config error:', error);
    
    return new Response(JSON.stringify({
      error: 'Configuration error',
      publicKey: null,
      developmentMode: true,
      configured: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

console.log('RevenueCat Config Edge Function is running...');
