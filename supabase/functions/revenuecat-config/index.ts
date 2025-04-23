
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publicKey = Deno.env.get('REVENUECAT_PUBLIC_KEY');
    const appPlatform = req.headers.get('x-app-platform') || 'unknown';
    
    // For debugging
    console.log("RevenueCat config request from platform:", appPlatform);
    console.log("RevenueCat public key retrieved:", publicKey ? `${publicKey.substring(0, 5)}...` : "Key not found");
    
    // Check platform-specific keys if needed
    let platformKey = publicKey;
    if (appPlatform === 'ios') {
      platformKey = Deno.env.get('REVENUECAT_IOS_KEY') || publicKey;
    } else if (appPlatform === 'android') {
      platformKey = Deno.env.get('REVENUECAT_ANDROID_KEY') || publicKey;
    }
    
    if (!platformKey) {
      throw new Error('RevenueCat public key not configured');
    }

    // Return key and debug info
    return new Response(
      JSON.stringify({ 
        publicKey: platformKey,
        platform: appPlatform,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error("Error in revenuecat-config function:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        env: {
          hasKey: Boolean(Deno.env.get('REVENUECAT_PUBLIC_KEY'))
        }
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
