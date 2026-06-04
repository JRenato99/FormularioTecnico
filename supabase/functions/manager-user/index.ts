// ==============================================================================
// EDGE FUNCTION: Gestión Segura de Usuarios (Create / Delete)
// ==============================================================================
// Esta función usa la SERVICE_ROLE_KEY (configurada como secret en Supabase)
// para crear y eliminar usuarios de forma segura desde el servidor,
// en lugar de hacerlo desde el frontend con la anon_key.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeadersFor } from '../_shared/cors.ts'

type ManageUserAction = 'create' | 'delete'

type Payload = {
  action: ManageUserAction
  email?: string
  password?: string
  role?: string
}

function jsonError(message: string, corsHeaders: Record<string, string>, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Busca un usuario en auth.users por email recorriendo TODAS las páginas.
// listUsers() devuelve solo 50 registros por defecto, por lo que sin paginar
// fallaría con "User not found" en cualquier sistema con más de 50 usuarios.
async function findAuthUserByEmail(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  email: string,
) {
  const perPage = 1000
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const found = data?.users?.find((u: { email?: string }) => u.email === email)
    if (found) return found

    // Si la página vino incompleta, ya no hay más usuarios que recorrer.
    if (!data?.users || data.users.length < perPage) return null
    page++
  }
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)

  // Manejar preflight CORS (necesario para que el navegador permita la petición)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extraer y validar el token JWT del caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError('Missing Authorization header', corsHeaders, 401)

    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return jsonError('Missing Bearer token', corsHeaders, 401)

    // 2. Crear cliente Supabase con SERVICE_ROLE_KEY (acceso total)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('ADMIN_SERVICE_ROLE_KEY')!,
      {
        auth: { persistSession: false },
      }
    )

    // 3. Verificar que el caller sea un usuario válido y obtener su info
    const { data: { user: callerUser }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !callerUser) return jsonError('Invalid or expired JWT', corsHeaders, 401)

    // 4. Verificar que el caller tenga rol ADMINISTRADOR en win_users
    const { data: callerProfile, error: profileError } = await supabase
      .from('win_users')
      .select('role')
      .eq('id', callerUser.id)
      .single()
    
    if (profileError || !callerProfile) return jsonError('User profile not found', corsHeaders, 403)
    if (callerProfile.role !== 'ADMINISTRADOR') {
      return jsonError('Forbidden: solo ADMINISTRADOR puede gestionar usuarios', corsHeaders, 403)
    }

    // 5. Procesar la acción solicitada
    const body = (await req.json()) as Payload
    if (!body?.action) return jsonError('Missing action', corsHeaders)

    // ─── CREAR USUARIO ──────────────────────────────────────────────
    if (body.action === 'create') {
      if (!body.email || !body.password || !body.role) {
        return jsonError('Missing email, password, or role', corsHeaders)
      }

      // Crear en auth.users con la service_role_key
      const { data, error } = await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true, // Confirmar email automáticamente (usuario interno)
        user_metadata: {
          role: body.role,
        },
      })

      if (error) throw error

      return new Response(JSON.stringify({ user: data.user }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── ELIMINAR USUARIO ───────────────────────────────────────────
    if (body.action === 'delete') {
      if (!body.email) return jsonError('Missing email for delete', corsHeaders)

      // Buscar al usuario por email en auth.users (paginado, soporta >50 usuarios)
      const targetUser = await findAuthUserByEmail(supabase, body.email)
      if (!targetUser) return jsonError('User not found in auth.users', corsHeaders, 404)

      // Eliminar de auth.users (win_users se borra por CASCADE si está configurado)
      const { error: delErr } = await supabase.auth.admin.deleteUser(targetUser.id)
      if (delErr) throw delErr

      return new Response(JSON.stringify({ deleted: true, userId: targetUser.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return jsonError('Invalid action. Use "create" or "delete"', corsHeaders)

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return jsonError(message, corsHeaders, 500)
  }
})