// ==============================================================================
// EDGE FUNCTION: Gestión Segura de Usuarios (Create / Delete)
// ==============================================================================
// Esta función usa la SERVICE_ROLE_KEY (configurada como secret en Supabase)
// para crear y eliminar usuarios de forma segura desde el servidor,
// en lugar de hacerlo desde el frontend con la anon_key.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type ManageUserAction = 'create' | 'delete'

type Payload = {
  action: ManageUserAction
  email?: string
  password?: string
  role?: string
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Manejar preflight CORS (necesario para que el navegador permita la petición)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extraer y validar el token JWT del caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError('Missing Authorization header', 401)

    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return jsonError('Missing Bearer token', 401)

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
    if (userError || !callerUser) return jsonError('Invalid or expired JWT', 401)

    // 4. Verificar que el caller tenga rol ADMINISTRADOR en win_users
    const { data: callerProfile, error: profileError } = await supabase
      .from('win_users')
      .select('role')
      .eq('id', callerUser.id)
      .single()
    
    if (profileError || !callerProfile) return jsonError('User profile not found', 403)
    if (callerProfile.role !== 'ADMINISTRADOR') {
      return jsonError('Forbidden: solo ADMINISTRADOR puede gestionar usuarios', 403)
    }

    // 5. Procesar la acción solicitada
    const body = (await req.json()) as Payload
    if (!body?.action) return jsonError('Missing action')

    // ─── CREAR USUARIO ──────────────────────────────────────────────
    if (body.action === 'create') {
      if (!body.email || !body.password || !body.role) {
        return jsonError('Missing email, password, or role')
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
      if (!body.email) return jsonError('Missing email for delete')

      // Buscar al usuario por email en auth.users
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers()
      if (listErr) throw listErr

      const targetUser = listData?.users?.find(u => u.email === body.email)
      if (!targetUser) return jsonError('User not found in auth.users', 404)

      // Eliminar de auth.users (win_users se borra por CASCADE si está configurado)
      const { error: delErr } = await supabase.auth.admin.deleteUser(targetUser.id)
      if (delErr) throw delErr

      return new Response(JSON.stringify({ deleted: true, userId: targetUser.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return jsonError('Invalid action. Use "create" or "delete"')

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return jsonError(message, 500)
  }
})