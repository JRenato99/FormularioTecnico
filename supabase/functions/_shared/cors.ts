// Encabezados CORS compartidos por todas las Edge Functions.
// Permiten que el navegador (frontend en Vercel) pueda llamar a estas funciones.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
