import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const platform = req.headers.get('x-platform') || 'android'
    
    console.log(`📱 RevenueCat function called - Platform: ${platform}`)
    console.log(`📋 Available env keys:`, {
      has_android: !!Deno.env.get('REVENUECAT_ANDROID_KEY'),
      has_ios: !!Deno.env.get('REVENUECAT_IOS_KEY')
    })

    let key: string | undefined
    
    if (platform === 'ios') {
      key = Deno.env.get('REVENUECAT_IOS_KEY')
    } else {
      key = Deno.env.get('REVENUECAT_ANDROID_KEY')
    }

    if (!key) {
      console.error(`❌ No key found for platform: ${platform}`)
      return new Response(
        JSON.stringify({ 
          error: `RevenueCat key not configured for ${platform}`,
          platform_requested: platform
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Returning key for platform: ${platform}`)
    
    return new Response(
      JSON.stringify({ key, platform }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})