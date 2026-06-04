// Manejo de CORS para las Edge Functions.
// En lugar de permitir cualquier origen ('*'), validamos el header Origin de la
// petición contra una lista blanca. Solo se refleja el origen si está permitido;
// de lo contrario se devuelve el primero de la lista (el de producción), lo que
// hace que el navegador bloquee la respuesta para orígenes no autorizados.

// Orígenes permitidos por defecto. Se pueden sobreescribir/ampliar definiendo el
// secret ALLOWED_ORIGINS en Supabase (lista separada por comas) sin tocar código.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://formtecnico.vercel.app', // Producción (Vercel)
  'http://localhost:5173',          // Vite dev server
  'http://localhost:4173',          // Vite preview
]

function getAllowedOrigins(): string[] {
  const fromEnv = Deno.env.get('ALLOWED_ORIGINS')
  if (fromEnv) {
    return fromEnv.split(',').map((o) => o.trim()).filter(Boolean)
  }
  return DEFAULT_ALLOWED_ORIGINS
}

// Devuelve los headers CORS apropiados según el Origin de la petición.
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = getAllowedOrigins()
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // Indica a las caches/CDN que la respuesta varía según el Origin.
    'Vary': 'Origin',
  }
}
