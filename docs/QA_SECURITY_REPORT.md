# 🔍 REPORTE DE AUDITORÍA QA & SEGURIDAD
## Proyecto: FormularioTecnico — WIN Perú
**Auditor:** Ingeniero QA Senior / Especialista en Seguridad  
**Fecha:** 12 de Mayo, 2026  
**Stack:** React + Vite · Supabase (Auth + PostgreSQL + Edge Functions) · Vercel  
**Archivos revisados:** 22 archivos fuente (JSX, JS, SQL, TS, JSON, .env)

---

> [!IMPORTANT]
> Este reporte es **solo lectura y diagnóstico**. No se ha modificado ningún archivo funcional del proyecto. Se han agregado comentarios guía en el código donde se indica.

---

## 📊 Resumen Ejecutivo

| Severidad | Hallazgos | Estado |
|-----------|-----------|--------|
| 🔴 CRÍTICO | 0 | ✅ Sistema estabilizado |
| 🟠 ALTO    | 3 | Planificar en próximo sprint |
| 🟡 MEDIO   | 6 | Deuda técnica / Optimizaciones |
| 🔵 BAJO    | 4 | Mejoras de calidad de código |
| **Total**  | **13** | (5 resueltos) |

---

## ✅ HALLAZGOS SOLUCIONADOS (Corte 12-Mayo)

---

### 🟢 [RESUELTO] C-01 — Notificaciones en Supabase Realtime
**Estado:** Corregido. Ahora las notificaciones se persisten en la tabla `win_notificaciones` y se consumen mediante Supabase en el Frontend.

### 🟢 [RESUELTO] C-02 — Protección de Rutas (ProtectedRoute)
**Estado:** Corregido. El componente ahora valida la sesión directamente contra el servidor de Supabase en cada carga de ruta, eliminando la vulnerabilidad de bypass por consola.

### 🟢 [RESUELTO] C-03 — Política RLS de Edición
**Estado:** Corregido. Se restauró el permiso para que los técnicos puedan editar órdenes en estado `RECHAZADO`.

### 🟢 [RESUELTO] A-02 — Eliminación de Mocks en Buscador
**Estado:** Corregido. Se eliminó la inyección de datos falsos en `BuscadorCliente.jsx` y se implementó validación real de existencia de pedidos.

---

## 🟠 HALLAZGOS PENDIENTES (Prioridad Alta)

---

### 🟠 A-01 — `addAuditLog` dispara promesas "fire and forget" sin manejo de error real

**Archivo:** `src/utils/authService.js` — Líneas 22-34

**Problema:**  
`addAuditLog` usa `.then()` pero no tiene `.catch()` para errores de red (timeout, Supabase caído). Peor aún, es llamada en operaciones críticas sin `await`:

```javascript
// ❌ Sin await + sin catch
await addAuditLog('LOGIN', 'SESION', email);
// Si Supabase está caído, el error se pierde silenciosamente

// La función internamente tampoco tiene try/catch completo
supabase.from('win_audit_logs').insert([...]).then(({ error }) => {
  if (error) console.error(...); // Solo un console.error, nunca llega al usuario
});
```

**Impacto:**  
Los logs de auditoría pueden perderse sin que nadie lo sepa. En un sistema empresarial, la auditoría incompleta es un fallo de cumplimiento (compliance).

---

---

### 🟠 A-03 — `useEffect` en `Header.jsx` tiene dependencia inestable de objeto

**Archivo:** `src/components/layout/Header.jsx` — Líneas 44-63

**Problema:**  
El `useEffect` tiene `[session.email]` como dependencia, pero `session` se obtiene con `getSession()` **fuera** del componente (línea 24), lo que significa que no está en el estado de React. Si la sesión cambia, el componente no se re-renderiza y la dependencia del `useEffect` no se actualiza:

```javascript
// ❌ session es calculado fuera del estado React
const session = getSession() || {}; // No es un estado, no dispara re-renders

useEffect(() => {
  // Este efecto solo corre una vez al montar (o cuando session.email cambia)
  // pero session.email nunca cambiará porque no es un estado React
  ...
}, [session.email]); // Dependencia que nunca cambia
```

**Impacto:**  
El canal Realtime de `header-realtime` se suscribe una vez y nunca se vuelve a suscribir correctamente si la sesión expira y se renueva.

---

### 🟠 A-04 — `deleteUser` en la Edge Function usa `listUsers()` sin paginación

**Archivo:** `supabase/functions/manager-user/index.ts` — Líneas 100-103

**Problema:**  
`supabase.auth.admin.listUsers()` sin parámetros devuelve por defecto los primeros 50 usuarios. Si el sistema escala a más de 50 usuarios, `targetUser` será `undefined` para usuarios en páginas posteriores y el delete fallará silenciosamente:

```typescript
// ❌ Sin paginación — falla con >50 usuarios
const { data: listData, error: listErr } = await supabase.auth.admin.listUsers()
const targetUser = listData?.users?.find(u => u.email === body.email)
if (!targetUser) return jsonError('User not found in auth.users', 404)
```

**Solución:**

```typescript
// ✅ Buscar directamente por email en lugar de listar todos
const { data: usersData } = await supabase.auth.admin.listUsers({
  perPage: 1000 // O usar getUserByEmail si está disponible
})
// Alternativa más eficiente: usar filter de la API Admin
```

---

### 🟠 A-05 — `FormularioTecnico.jsx`: autoguardado activo en modo edición puede sobreescribir borrador incorrecto

**Archivo:** `src/pages/FormularioTecnico.jsx` — Líneas 87-95

**Problema:**  
El `useEffect` de autoguardado con debounce corre en **ambos modos** (normal y edición). En modo edición de una orden rechazada, se activa `saveDraft(codigoCliente, ...)` aunque el técnico no haya terminado de corregir, generando un borrador parcial que podría confundirse con una nueva orden:

```javascript
// ❌ Autoguardado activo incluso en modoEdicion (no debería crear un draft nuevo)
useEffect(() => {
  if (equipos.length === 0 && mediciones.length === 0) return;
  const timer = setTimeout(() => {
    saveDraft(codigoCliente, { equipos, mediciones, winboxes, televisores }); // Siempre guarda
  }, 800);
  return () => clearTimeout(timer);
}, [equipos, mediciones, winboxes, televisores, codigoCliente]);
```

---

## 🟡 HALLAZGOS MEDIOS

---

### 🟡 M-01 — Dependencia `supabase` CLI en `dependencies` en lugar de `devDependencies`

**Archivo:** `package.json` — Línea 19

**Problema:**  
El paquete `"supabase": "^2.98.2"` (CLI de Supabase) está listado en `dependencies` en lugar de `devDependencies`. Este paquete pesa varios MBs y es solo una herramienta de desarrollo local.

```json
// ❌ ACTUAL
"dependencies": {
    "supabase": "^2.98.2"  // ← CLI de desarrollo en bundle de producción
}

// ✅ CORRECTO
"devDependencies": {
    "supabase": "^2.98.2"
}
```

**Impacto:**  
Aumenta el tamaño del bundle de producción y el tiempo de build en Vercel innecesariamente.

---

### 🟡 M-02 — `getOrders()` hace `SELECT *` con join — expone columnas sensibles innecesariamente

**Archivo:** `src/utils/databaseService.js` — Líneas 140-146

**Problema:**  
La query usa `SELECT *` sobre `win_orders`, que incluye todos los campos JSONB. Aunque RLS filtra filas, no filtra columnas. Si en el futuro se añaden campos sensibles a la tabla, todos serán expuestos al frontend.

```javascript
// ❌ SELECT * — trae todo sin discriminar
const { data, error } = await supabase
  .from('win_orders')
  .select(`
    *,                                    // ← Trae todo
    tecnico:win_users!tecnico_id(email, cuadrilla, nombre)
  `)
```

**Solución recomendada:** Enumerar solo los campos necesarios:

```javascript
// ✅ Columnas explícitas
.select(`
  id, cod_pedido, estado, motivo_rechazo,
  datos_cliente, hardware_data, created_at, updated_at,
  tecnico:win_users!tecnico_id(email, cuadrilla, nombre)
`)
```

---

### 🟡 M-03 — `RPC check_duplicate_sn` no está protegida por RLS de ejecución

**Archivo:** `supabase/schema.sql` — Líneas 131-158  
**Archivo:** `supabase/rpc_check_sn.sql`

**Problema:**  
La función RPC `check_duplicate_sn` consulta **toda** la tabla `win_orders` sin restricción de usuario. Un técnico autenticado podría llamar directamente a esta RPC para descubrir qué S/N ya están registrados en el sistema (información de otros técnicos).

Adicionalmente, hay **dos versiones** del mismo RPC: una en `schema.sql` (con `exclude_cod_pedido`) y otra en `rpc_check_sn.sql` (sin ese parámetro). Esto genera ambigüedad sobre cuál versión está realmente activa en producción.

**Solución:**  
Añadir `SECURITY DEFINER` con lógica de validación interna, o configurar el permiso de ejecución exclusivamente para roles necesarios.

---

### 🟡 M-04 — `PanelAdmin.jsx` tiene 3 canales Realtime concurrentes

**Archivos:**  
- `src/pages/PanelAdmin.jsx` — Canal `admin-realtime`  
- `src/components/layout/Header.jsx` — Canal `header-realtime`  
- `src/pages/BuscadorCliente.jsx` — Canal `buscador-realtime`

**Problema:**  
Todos escuchan cambios en la tabla `win_orders`. Cuando el admin está en el Panel, se abren **dos** conexiones WebSocket simultáneas (una de PanelAdmin + una del Header) que disparan la misma recarga de datos.

**Impacto:** Doble consumo de créditos de Realtime en Supabase y re-renders redundantes.

---

### 🟡 M-05 — El captcha matemático es trivialmente bypassable

**Archivo:** `src/pages/Login.jsx` — Líneas 68-71, 100-103

**Problema:**  
El captcha con operaciones `(1..10) + (1..10)` tiene solo 100 combinaciones posibles de respuesta (2 a 20). Un bot puede resolverlo por fuerza bruta en milisegundos. Además, el captcha es generado **en el cliente** (JavaScript), por lo que cualquier atacante puede leer los valores directamente en el estado de React DevTools.

**Impacto:** Protección anti-bot prácticamente nula para un atacante técnico.

**Sugerencia:** Integrar Google reCAPTCHA v3 (invisible) como indica el ROADMAP, Fase 2, Paso 2.4.

---

### 🟡 M-06 — `updateOrderStatus` en `databaseService.js` no valida el `nuevoEstado`

**Archivo:** `src/utils/databaseService.js` — Líneas 170-188

**Problema:**  
La función acepta cualquier string como `nuevoEstado` sin validación del lado del cliente. Si por error se pasa un valor inválido, la DB lo rechazará (hay un `CHECK constraint`), pero el error llegará al usuario sin contexto claro:

```javascript
// ❌ Sin validación del valor del estado
export const updateOrderStatus = async (codigoCliente, nuevoEstado, motivo = '') => {
  const updatePayload = { estado: nuevoEstado, ... }; // Cualquier string pasa
```

**Solución:**

```javascript
// ✅ Validar antes de enviar
const ESTADOS_VALIDOS = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
  return { success: false, error: `Estado inválido: ${nuevoEstado}` };
}
```

---

## 🔵 HALLAZGOS BAJOS

---

### 🔵 B-01 — Sin `PropTypes` ni TypeScript en componentes React

**Archivos:** Todos los `.jsx` en `src/components/`

**Problema:**  
Ningún componente tiene definidos `PropTypes`. Pasar el prop incorrecto (ej. `equipos` como `null` en lugar de `[]`) puede causar crashes en runtime difíciles de depurar.

```jsx
// ❌ Sin validación de props
const FormularioMediciones = ({ equipos, mediciones, setMediciones, ... }) => {
  // Si 'equipos' llega como null, equipos.length lanza TypeError
```

**Solución mínima:**

```javascript
import PropTypes from 'prop-types';
FormularioMediciones.propTypes = {
  equipos: PropTypes.array.isRequired,
  mediciones: PropTypes.array.isRequired,
  setMediciones: PropTypes.func.isRequired,
};
```

---

### 🔵 B-02 — `must_change_password` no está en la columna `win_users` del `schema.sql`

**Archivo:** `supabase/schema.sql` — Línea 16  
**Referencia en código:** `authService.js` — Línea 190

**Problema:**  
La columna `must_change_password` es usada extensamente en `authService.js` (crear usuario, login, changePassword), pero **no está definida** en el `schema.sql` original. Fue añadida implícitamente pero no está documentada en el esquema base.

**Riesgo:** Si alguien ejecuta `schema.sql` desde cero para un nuevo entorno, el sistema fallará al intentar leer/escribir esa columna.

**Solución:**  
Añadir la columna al `schema.sql`:

```sql
-- En la definición de win_users, agregar:
must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
```

---

### 🔵 B-03 — IDs generados con `Math.random()` pueden colisionar en alto volumen

**Archivos:**  
- `FormularioMediciones.jsx` línea 35: `MED-${Date.now()}-${Math.random().toString(36).substring(7)}`  
- `FormularioWinbox.jsx` línea 25: Mismo patrón  
- `FormularioWintv.jsx` línea 30: Mismo patrón

**Problema:**  
`Math.random()` en JavaScript no es criptográficamente seguro y puede colisionar en entornos de alta concurrencia o en dispositivos con relojes poco precisos. Si dos IDs colisionan, los `map()` y `filter()` basados en `id` producirán comportamientos inesperados.

**Solución recomendada:**

```javascript
// ✅ Usar crypto.randomUUID() nativo (disponible en todos los navegadores modernos)
id: `MED-${crypto.randomUUID()}`,
```

---

### 🔵 B-04 — `handleLogout` en `Header.jsx` no es `async` pero llama función `async`

**Archivo:** `src/components/layout/Header.jsx` — Líneas 83-86

**Problema:**  
`logout()` en `authService.js` es `async` (hace `await supabase.auth.signOut()`), pero `handleLogout` no la awaita. La navegación a `/login` ocurre antes de que `signOut` complete:

```javascript
// ❌ navigate() corre ANTES de que supabase.auth.signOut() complete
const handleLogout = () => {
  logout();          // Es async pero no se await-a
  navigate('/login'); // Corre inmediatamente
};

// ✅ Corrección (solo comentario guía — no modifica funcionalidad)
const handleLogout = async () => {
  await logout();
  navigate('/login');
};
```

---

## 📋 MATRIZ DE PRIORIZACIÓN

```
IMPACTO   │ ESFUERZO →    BAJO           MEDIO           ALTO
──────────┼──────────────────────────────────────────────────
CRÍTICO   │        (NINGUNO)      (NINGUNO)       (NINGUNO)
ALTO      │         A-05 (Draft)    A-01 (Audit)   A-04 (Edge Fn)
          │                         A-03 (Hook)    (SOLUCIONADO)
MEDIO     │          M-06 (Valid)   M-01 (pkg.json) M-04 (Realtime)
          │          M-02 (SELECT)  M-03 (RPC)     M-05 (Captcha)
BAJO      │          B-04 (async)   B-01 (Props)   B-02 (Schema)
          │                         B-03 (IDs)
```

---

## ✅ ASPECTOS POSITIVOS VERIFICADOS

| Aspecto | Evaluación |
|---------|-----------|
| `service_role_key` en el frontend | ✅ NO expuesta. Correctamente en Edge Function |
| Variables de entorno `.env` | ✅ Correctamente ignoradas en `.gitignore` |
| Archivos SQL en `.gitignore` | ✅ `supabase/*.sql` excluidos del repositorio |
| RLS habilitado en todas las tablas | ✅ `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` verificado |
| Validación de contraseñas (regex) | ✅ Robusta: mayúscula, minúscula, número, símbolo |
| Sanitización de inputs numéricos | ✅ `replace(/\D/g, '')` en todos los campos de números |
| Verificación de unicidad de S/N | ✅ Implementada via RPC en Supabase |
| Protección contra SQL Injection | ✅ Uso exclusivo del ORM de Supabase (sin SQL crudo del lado del cliente) |
| Verificación de rol en Edge Function | ✅ La función `manager-user` valida que el caller sea ADMINISTRADOR |
| Try/catch en operaciones críticas de BD | ✅ Presente en `saveOrder`, `getOrders`, `login` |
| React.StrictMode activado | ✅ `main.jsx` — útil para detectar efectos secundarios |
| Feedback visual al usuario (Toasts/Modals) | ✅ Sistema robusto implementado |

---

## 🚀 PLAN DE ACCIÓN RECOMENDADO

### Sprint 1 (Esta semana — CRÍTICOS)
1. **C-03**: Ejecutar parche SQL para restaurar política RLS de edición de órdenes rechazadas.
2. **C-02**: Añadir `onAuthStateChange` en `App.jsx` para limpiar sesión en tiempo real.
3. **C-01**: Diseñar tabla `win_notifications` en Supabase (reemplazar el `localStorage` de notificaciones).

### Sprint 2 (Próximas 2 semanas — ALTOS)
4. **A-02**: Implementar integración real con API de clientes de WIN (reemplazar mock).
5. **A-04**: Usar búsqueda directa por email en la Edge Function (evitar `listUsers()` sin paginación).
6. **A-01**: Añadir retry/logging formal al sistema de auditoría.
7. **A-05**: Deshabilitar autoguardado de borradores en modo edición.

### Sprint 3 (Mejoras de calidad)
8. **M-01**: Mover `supabase` CLI a `devDependencies`.
9. **M-02**: Reemplazar `SELECT *` por columnas explícitas.
10. **B-02**: Documentar `must_change_password` en `schema.sql`.
11. **B-04**: Convertir `handleLogout` en `async/await`.
12. **B-03**: Migrar generación de IDs a `crypto.randomUUID()`.

---

*Reporte generado por Auditoría Estática — FormularioTecnico v1.0.1*  
*Próxima revisión recomendada: Tras implementar Fase 4 (API WIN) del Roadmap*
