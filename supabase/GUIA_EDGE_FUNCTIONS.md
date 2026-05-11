# Guía Completa: Configuración de Supabase (Redirect URLs + Edge Functions)

---

## PARTE A: Configurar Redirect URL para Reset de Contraseña

### ¿Para qué sirve esto?
Cuando un Admin le da "Restablecer Contraseña" a un usuario, Supabase envía un email con un enlace. 
Ese enlace necesita saber **a dónde redirigir** al usuario después de hacer clic. 
Sin configurar esto, el enlace del email lleva a una página genérica de Supabase que no existe.

### Pasos:

1. **Ingresa al Dashboard de Supabase** → https://supabase.com/dashboard
2. **Selecciona tu proyecto** (FormularioTecnico)
3. **En el menú lateral izquierdo**, haz clic en **Authentication** (icono de candado)
4. **En el menú superior de Authentication**, haz clic en **URL Configuration**
5. Verás dos secciones:
   - **Site URL**: Debe tener la URL de tu app en Vercel. Ejemplo: `https://formulario-tecnico.vercel.app`
   - **Redirect URLs**: Aquí añades las URLs permitidas.

6. **Haz clic en "Add URL"** y agrega estas dos URLs:

```
https://formulario-tecnico.vercel.app/#/login
http://localhost:5173/#/login
```

> Nota: Reemplaza `formulario-tecnico.vercel.app` con tu dominio real de Vercel.
> La segunda URL (`localhost`) es para que funcione en desarrollo local.

7. **Haz clic en "Save"** al final de la página.

### ¿Cómo verifico que funciona?
- Entra al Panel Admin → Usuarios → haz clic en el icono de llave (🔑) de un usuario.
- Confirma el envío del email de reset.
- Revisa la bandeja de entrada del correo de ese usuario. Debería llegar un email con un enlace que redirige a tu app.

---

## PARTE B: Desplegar la Edge Function

### ¿Qué archivos ya tienes listos?
Yo ya creé estos archivos en tu proyecto:
- `supabase/functions/manager-user/index.ts` → La función principal (corregida)
- `supabase/functions/_shared/cors.ts` → Los encabezados CORS compartidos

**No necesitas tocar estos archivos.** Solo necesitas desplegarlos a Supabase.

---

### Paso 1: Verificar que tienes Supabase CLI instalado
Abre una terminal (PowerShell) y ejecuta:
```powershell
supabase --version
```
Si aparece un número de versión (ej. `1.145.0`), ya lo tienes. Si no, instálalo:
```powershell
npx supabase --version
```
O instálalo globalmente:
```powershell
npm install -g supabase
```

### Paso 2: Vincular tu proyecto local con Supabase

Primero necesitas tu **Project Reference ID**:
1. Ve a **Supabase Dashboard** → tu proyecto → **Settings** (⚙️ en el menú lateral)
2. En la pestaña **General**, copia el valor de **Reference ID** (es un string como `abcdefghijklmnop`)

Luego ejecuta en la terminal:
```powershell
cd "c:\Users\jsolanos\OneDrive - WI-NET TELECOM\Proyectos Varios\FormularioTecnico"
npx supabase login
npx supabase link --project-ref TU_REFERENCE_ID
```
> Reemplaza `TU_REFERENCE_ID` con el valor que copiaste.
> Si te pide la **database password**, es la contraseña que elegiste al crear el proyecto de Supabase.

### Paso 3: Configurar la SERVICE_ROLE_KEY como secreto

La `SERVICE_ROLE_KEY` es una clave secreta de tu proyecto. Para obtenerla:
1. Ve a **Supabase Dashboard** → tu proyecto → **Settings** → **API**
2. En la sección "Project API keys", copia el valor de **service_role** (⚠️ dice "This key has the ability to bypass RLS")

Luego ejecuta:
```powershell
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### Paso 4: Desplegar la función
```powershell
npx supabase functions deploy manager-user --no-verify-jwt
```

Si el deploy es exitoso, verás un mensaje como:
```
Edge Function 'manager-user' is deployed
```

### Paso 5: Verificar que la función está activa
1. Ve a **Supabase Dashboard** → **Edge Functions** (en el menú lateral)
2. Deberías ver `manager-user` en la lista con estado **Active** ✅

---

## PARTE C: Lo que yo haré después

Una vez que completes los pasos anteriores y me confirmes que:
1. ✅ La redirect URL está configurada
2. ✅ La Edge Function está desplegada y activa

Yo me encargo de:
- Modificar `authService.js` para que `addUser` y `deleteUser` llamen a la Edge Function en lugar de usar `supabase.auth.signUp()` directamente
- Hacer las pruebas y el push al repositorio

---

## Resumen visual

```
┌─────────────────────────────────────────────────┐
│ ANTES (Inseguro)                                │
│                                                 │
│ Frontend ──(anon_key)──► supabase.auth.signUp() │
│ ⚠️ Cualquiera puede crear usuarios              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ DESPUÉS (Seguro)                                │
│                                                 │
│ Frontend ──(JWT Admin)──► Edge Function          │
│                              │                  │
│                    (SERVICE_ROLE_KEY)            │
│                              │                  │
│                              ▼                  │
│                   supabase.auth.admin.createUser │
│ ✅ Solo Admins autenticados pueden crear         │
└─────────────────────────────────────────────────┘
```
