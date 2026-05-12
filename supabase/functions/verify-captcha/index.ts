import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Manejo de CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY')
    if (!secretKey) {
      throw new Error('RECAPTCHA_SECRET_KEY is not set')
    }

    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify'
    
    // Google reCAPTCHA v3 espera los datos como form-urlencoded
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)

    const recaptchaResponse = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })

    const data = await recaptchaResponse.json()

    // En reCAPTCHA v3, la API devuelve success y un score (0.0 a 1.0)
    // score > 0.5 generalmente indica un humano confiable
    if (data.success && data.score >= 0.5) {
      return new Response(JSON.stringify({ success: true, score: data.score }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed reCAPTCHA validation', 
        details: data 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
