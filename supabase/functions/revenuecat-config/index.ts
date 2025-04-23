
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-platform',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the platform from headers or user agent
    const appPlatform = req.headers.get('x-app-platform') || detectPlatform(req.headers.get('user-agent') || '');
    
    // Get the public key from environment variables
    const publicKey = Deno.env.get('REVENUECAT_PUBLIC_KEY');
    
    // For debugging
    console.log("RevenueCat config request from platform:", appPlatform);
    console.log("RevenueCat public key status:", publicKey ? "Available" : "Not found");
    console.log("User agent:", req.headers.get('user-agent'));
    
    // Check platform-specific keys if needed
    let platformKey = publicKey;
    if (appPlatform === 'ios') {
      platformKey = Deno.env.get('REVENUECAT_IOS_KEY') || publicKey;
    } else if (appPlatform === 'android') {
      platformKey = Deno.env.get('REVENUECAT_ANDROID_KEY') || publicKey;
    }
    
    if (!platformKey) {
      throw new Error('RevenueCat public key not configured. Please set REVENUECAT_PUBLIC_KEY in Supabase secrets.');
    }

    // Return key and debug info
    return new Response(
      JSON.stringify({ 
        publicKey: platformKey,
        platform: appPlatform,
        timestamp: new Date().toISOString(),
        envStatus: {
          hasGenericKey: Boolean(Deno.env.get('REVENUECAT_PUBLIC_KEY')),
          hasIosKey: Boolean(Deno.env.get('REVENUECAT_IOS_KEY')),
          hasAndroidKey: Boolean(Deno.env.get('REVENUECAT_ANDROID_KEY'))
        }
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
          hasKey: Boolean(Deno.env.get('REVENUECAT_PUBLIC_KEY')),
          hasIosKey: Boolean(Deno.env.get('REVENUECAT_IOS_KEY')),
          hasAndroidKey: Boolean(Deno.env.get('REVENUECAT_ANDROID_KEY'))
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

// Helper function to detect platform from user agent
function detectPlatform(userAgent: string): string {
  if (!userAgent) return 'unknown';
  
  const lowerUA = userAgent.toLowerCase();
  if (lowerUA.includes('iphone') || lowerUA.includes('ipad') || lowerUA.includes('ipod')) {
    return 'ios';
  } else if (lowerUA.includes('android')) {
    return 'android';
  }
  
  return 'unknown';
}
