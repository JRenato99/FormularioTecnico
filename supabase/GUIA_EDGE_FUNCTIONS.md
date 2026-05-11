# Guía: Configurar Edge Function para Gestión Segura de Usuarios

## Contexto
Actualmente, `addUser` y `deleteUser` usan la `anon_key` desde el frontend, lo cual expone operaciones críticas. La solución es mover estas operaciones a una **Edge Function** que use la `SERVICE_ROLE_KEY` de forma segura en el servidor.

---

## Paso 1: Instalar Supabase CLI (si no lo tienes)
```bash
npm install -g supabase
```

## Paso 2: Inicializar Supabase en el proyecto
```bash
cd c:\Users\jsolanos\OneDrive - WI-NET TELECOM\Proyectos Varios\FormularioTecnico
supabase init
supabase login
supabase link --project-ref TU_PROJECT_REF
```
> Tu `PROJECT_REF` lo encuentras en Supabase → Settings → General → Reference ID.

## Paso 3: Crear la Edge Function
```bash
supabase functions new manage-user
```
Esto crea `supabase/functions/manage-user/index.ts`.

## Paso 4: Reemplazar el contenido de `index.ts`
Copia y pega el código que te proporcionó la IA de Supabase (el que pegaste en tu comentario). Ese código es correcto y hace exactamente lo que necesitamos:

1. Verifica que el caller tenga un JWT válido de Admin.
2. Para `action: 'create'` → Usa `supabase.auth.admin.createUser()` con la `SERVICE_ROLE_KEY`.
3. Para `action: 'delete'` → Busca al usuario por email y lo elimina de `auth.users`.

## Paso 5: Crear el archivo de CORS compartido
Crea el archivo `supabase/functions/_shared/cors.ts`:
```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Paso 6: Configurar la `SERVICE_ROLE_KEY` como secret
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```
> La `SERVICE_ROLE_KEY` la encuentras en Supabase → Settings → API → `service_role` (⚠️ NUNCA la pongas en el frontend ni en `.env` del proyecto React).

## Paso 7: Desplegar la función
```bash
supabase functions deploy manage-user --no-verify-jwt
```
> Usamos `--no-verify-jwt` porque la verificación la hacemos manualmente dentro de la función.

## Paso 8: Probar la función
```bash
curl -X POST https://TU_PROJECT_REF.supabase.co/functions/v1/manage-user \
  -H "Authorization: Bearer TU_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","email":"test@win.pe","password":"Test1234!","role":"TECNICO"}'
```

## Paso 9: Actualizar el Frontend
Una vez desplegada, se modifica `authService.js` para llamar a la Edge Function en lugar de `supabase.auth.signUp()`:
```js
const { data, error } = await supabase.functions.invoke('manage-user', {
  body: { action: 'create', email, password, role }
});
```

---

## Resumen de Seguridad
| Antes | Después |
|-------|---------|
| `anon_key` crea usuarios desde el navegador | `SERVICE_ROLE_KEY` crea usuarios en el servidor |
| `deleteUser` deja huérfanos en `auth.users` | Edge Function elimina de `auth.users` Y `win_users` |
| Cualquiera con la URL puede registrar usuarios | Solo JWTs de ADMINISTRADOR pueden invocar la función |
