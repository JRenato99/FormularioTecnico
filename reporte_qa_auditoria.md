# 🔍 REPORTE DE AUDITORÍA QA — FormularioTecnico
**Fecha:** 2026-05-11 | **Auditor:** Ingeniero QA Senior (Antigravity)  
**Stack:** React + Vite · Supabase BaaS · Vercel · Vanilla CSS

---

## RESUMEN EJECUTIVO

| Severidad | Hallazgos |
|-----------|-----------|
| 🔴 CRÍTICO | 4 |
| 🟠 ALTO | 7 |
| 🟡 MEDIO | 6 |
| 🔵 BAJO | 8 |
| **Total** | **25** |

---

## 🔴 CRÍTICOS

### C-01 · `addUser` en `authService.js` — Creación de usuarios desde el cliente sin Service Role Key

**Archivo:** `src/utils/authService.js` · Líneas 173–178  
**Descripción:**  
La función `addUser` llama a `supabase.auth.signUp()` directamente desde el **frontend** usando la `anon_key`. El problema es que `signUp` en Supabase crea el usuario en `auth.users` **sin necesitar sesión previa**. Cualquier persona que inspeccione el tráfico de red puede obtener la URL del proyecto y la `anon_key` (ambas ya visibles en el bundle JS), y ejecutar peticiones para crear usuarios con cualquier rol. La política RLS de `win_users` valida el rol del insertador, pero el registro en `auth.users` ya fue creado.

```js
// ❌ PROBLEMA: Cualquier usuario puede llamar a signUp si conoce las credenciales del cliente
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: data.email,
  password: data.password
});
```

**Solución correcta:**  
Crear un **Supabase Edge Function** (serverless) que use la `service_role_key` de forma segura en el servidor para crear usuarios en Auth. El frontend solo llama a esa función con un JWT de Admin válido.

```
POST /functions/v1/create-user
Authorization: Bearer <admin_jwt>
Body: { email, password, role, cuadrilla }
```

---

### C-02 · `deleteUser` en `authService.js` — Elimina de `win_users` pero no de `auth.users`

**Archivo:** `src/utils/authService.js` · Líneas 247–248  
**Descripción:**  
`deleteUser` solo ejecuta `supabase.from('win_users').delete()`. Esto elimina el perfil de la tabla pública, pero el usuario **permanece en `auth.users`** de Supabase. El resultado es un **registro huérfano**: el usuario puede seguir haciendo `signIn` con sus credenciales originales, recibir un JWT válido de Supabase, y aunque el JOIN con `win_users` falle, podría causar comportamientos inesperados o ser explotado.

```js
// ❌ Solo borra de la tabla pública. El usuario sigue en auth.users
const { error } = await supabase.from('win_users').delete().eq('email', email);
```

**Solución:**  
Al igual que C-01, esta operación requiere una Edge Function con `service_role_key` para llamar a `supabase.auth.admin.deleteUser(userId)`.

---

### C-03 · `resetUserPassword` — No restablece la contraseña, solo levanta una bandera

**Archivo:** `src/utils/authService.js` · Líneas 202–216  
**Descripción:**  
La función `resetUserPassword` recibe una contraseña temporal del Admin, valida su formato... y **nunca la envía a ningún lado**. Solo actualiza el campo `must_change_password: true` en `win_users`. La contraseña del usuario en `auth.users` **nunca cambia**. El Admin cree que ha restablecido la contraseña, pero el usuario sigue usando su contraseña anterior. Esto es un **fallo funcional grave** que genera una falsa sensación de seguridad.

```js
// ❌ La contraseña `newTempPassword` recibida nunca se aplica en Supabase Auth
export const resetUserPassword = async (userEmail, newTempPassword) => {
  const pwdCheck = validatePassword(newTempPassword);
  // ... solo actualiza must_change_password=true, nunca cambia la contraseña
};
```

**Solución:**  
Usar una Edge Function con `auth.admin.updateUserById(userId, { password })` o migrar al flujo de `resetPasswordForEmail` que envía un enlace seguro por email.

---

### C-04 · `ProtectedRoute.jsx` — El guard de seguridad solo verifica localStorage

**Archivo:** `src/components/layout/ProtectedRoute.jsx` · Líneas 11–33  
**Descripción:**  
Toda la seguridad de las rutas React depende de si existe `win_session` en `localStorage`. Este valor **puede ser manipulado manualmente** desde DevTools del navegador. Un actor malicioso puede escribir `localStorage.setItem('win_session', JSON.stringify({ role: 'ADMINISTRADOR', email: 'hack@win.pe' }))` y obtener acceso al Panel Admin en el cliente. Aunque las RLS de Supabase protegen los datos reales, el acceso a la UI de administración queda expuesto.

```js
// ❌ Seguridad solo en cliente: localStorage es manipulable
const sessionStr = localStorage.getItem('win_session');
if (!sessionStr) return <Navigate to="/login" replace />;
const session = JSON.parse(sessionStr);
if (allowedRoles && !allowedRoles.includes(session.role)) { ... }
```

**Solución:**  
El guard del cliente es aceptable como UX, pero debe complementarse verificando el JWT de Supabase Auth en el arranque de la app (en un `useEffect` de `App.jsx`) mediante `supabase.auth.getSession()`. Si la sesión de Supabase no existe o no coincide con la de localStorage, limpiar y redirigir.

```js
// ✅ Verificar sesión real de Supabase en el arranque
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      localStorage.removeItem('win_session');
      navigate('/login');
    }
  });
}, []);
```

---

## 🟠 ALTOS

### A-01 · `main.jsx` — `UIProvider` duplicado

**Archivo:** `src/main.jsx` · Líneas 4, 9–11  
**Descripción:**  
`UIProvider` está montado **dos veces**: una en `main.jsx` envolviendo a `<App />`, y otra dentro de `App.jsx` (línea 11) envolviendo al `<Router>`. Esto crea **dos contextos UI anidados**. El `useUI()` dentro de los componentes resuelve al contexto más cercano (el de `App.jsx`), pero el de `main.jsx` queda flotando, creando una instancia de estado Toast/Modal que nunca se usa y consume memoria.

```jsx
// ❌ main.jsx — Provider externo innecesario
<UIProvider>  {/* ← Este es redundante */}
  <App />
</UIProvider>
```

**Solución:** Eliminar el `UIProvider` de `main.jsx` y mantener solo el de `App.jsx`.

---

### A-02 · `BuscadorCliente.jsx` — `handleBuscar` usa datos simulados (mock)

**Archivo:** `src/pages/BuscadorCliente.jsx` · Líneas 54–67  
**Descripción:**  
La función de búsqueda de cliente **no consulta ninguna base de datos**. Usa un `setTimeout` con datos hardcodeados (dirección, plan) para simular una respuesta. En producción, el técnico podría ingresar cualquier código y el sistema lo aceptará como válido, permitiendo crear órdenes con códigos de clientes que no existen.

```js
// ❌ Datos completamente simulados — no valida en ninguna BD
setTimeout(() => {
  setCliente({
    codigo: codigo,
    plan: '1000 Mbps - Fibra',          // ← hardcodeado
    direccion: 'Av. Javier Prado Este 1234...',  // ← hardcodeado
    tipo: 'Instalación Nueva'
  });
}, 800);
```

**Solución:** Integrar una consulta real a Supabase (o a la API del CRM de WIN) para validar que el `cod_pedido` existe antes de permitir el acceso al formulario.

---

### A-03 · `authService.js` — `addAuditLog` es fire-and-forget sin manejo de sesión Auth

**Archivo:** `src/utils/authService.js` · Líneas 22–33  
**Descripción:**  
`addAuditLog` usa `.then()` sin `await`, lo que significa que si falla, el error solo se logea en consola y **nunca se propaga**. Más crítico: el campo `actor_id` en `win_audit_logs` (definido en el schema) nunca se rellena porque la función toma el `id` de `getSession()` (localStorage) pero **no lo inserta en el payload**. Los logs de auditoría quedan sin actor identificable en la BD.

```js
// ❌ actor_id nunca se envía — los logs no tienen autor en la BD
supabase.from('win_audit_logs').insert([{
  accion,
  entidad_afectada: recursoTipo,
  // actor_id: session?.id  ← FALTA
  descripcion: `${session?.email} ejecutó ${accion}`,
}]).then(({ error }) => { /* solo console.error */ });
```

---

### A-04 · `PanelAdmin.jsx` — Pestaña AUDITORÍA renderizada dos veces

**Archivo:** `src/pages/PanelAdmin.jsx` · Líneas 595–663 y 761–801  
**Descripción:**  
El bloque `{activeTab === 'AUDITORIA' && (...)}` aparece **dos veces** en el JSX del componente (una primera implementación en línea ~595 y una segunda versión en línea ~761). Ambas se renderizan simultáneamente cuando `activeTab === 'AUDITORIA'`, causando que `fetchAuditLogs()` se llame dos veces y la tabla aparezca duplicada en pantalla. Esto también genera dos llamadas innecesarias a Supabase.

**Solución:** Eliminar uno de los dos bloques (conservar el segundo que es más completo, líneas 761–801).

---

### A-05 · `FormularioTecnico.jsx` — `doDescargarCSV` accesible antes de generar el CSV

**Archivo:** `src/pages/FormularioTecnico.jsx` · Línea 355  
**Descripción:**  
El botón "Descargar Borrador Excel" está habilitado si `mediciones.length > 0`, pero llama a `doDescargarCSV()` que usa `csvContentGenerated` (estado). Este estado solo se rellena dentro de `handlePreFinalizar()`. Si el usuario tiene mediciones pero nunca abre el modal de resumen, `csvContentGenerated` estará vacío (`''`) y descargará **un CSV en blanco** con solo el BOM UTF-8.

```js
// ❌ csvContentGenerated puede estar vacío si no se pasó por handlePreFinalizar
const blob = new Blob(['\uFEFF' + csvContentGenerated], ...);
```

**Solución:** En `doDescargarCSV`, llamar a `generateCSVContent()` directamente en lugar de depender del estado.

---

### A-06 · `TopologiaRed.jsx` — `showToast` usado sin importar `useUI`

**Archivo:** `src/components/features/TopologiaRed.jsx` · Líneas 76–77, 125  
**Descripción:**  
Las funciones `handleAddOnt`, `handleAddAp` y otras llaman a `showToast(...)`, pero `useUI` **nunca se desestructura** en el cuerpo del componente. La variable `showToast` no está definida en este scope, lo que causará un `ReferenceError: showToast is not defined` en runtime al intentar agregar una ONT o AP inválido.

```js
// ❌ useUI no está desestructurado — showToast no existe en este componente
const TopologiaRed = ({ equipos, setEquipos, ... }) => {
  // Falta: const { showToast } = useUI();
  const handleAddOnt = () => {
    if (!newOnt.serialNumber) return showToast({ ... }); // ← ReferenceError
  };
```

> [!IMPORTANT]
> Este bug rompe completamente el flujo de agregar equipos y no genera ningún feedback al usuario.

---

### A-07 · `PanelAdmin.jsx` — Suscripción Realtime en `useEffect` sin dependencia estable

**Archivo:** `src/pages/PanelAdmin.jsx` · Líneas 79–93  
**Descripción:**  
El `useEffect` que crea la suscripción Realtime tiene `[activeTab]` como dependencia. Cada vez que el usuario cambia de pestaña, se **destruye y crea un nuevo canal**. Esto es correcto en concepto, pero `cargarOrdenes` se llama dentro del closure sin ser una dependencia declarada, lo que puede capturar un closure obsoleto (`stale closure`). Adicionalmente, si el canal anterior no se limpia correctamente antes de crear el nuevo, se pueden acumular múltiples suscripciones activas.

---

## 🟡 MEDIOS

### M-01 · `schema.sql` — RLS de `win_orders` no protege contra edición de TECNICO en orden APROBADA

**Archivo:** `supabase/schema.sql` · Líneas 88–93  
**Descripción:**  
La política `Actualizacion de ordenes` permite a un TECNICO hacer UPDATE si `estado IN ('PENDIENTE', 'RECHAZADO')`. Sin embargo, la lógica del frontend en `databaseService.js` (línea 102) hace la verificación, no la BD en `fix_rls.sql`. El script `fix_rls.sql` tiene una versión diferente que solo permite editar si `estado = 'PENDIENTE'` (sin incluir `RECHAZADO`), lo que crearía una **discrepancia entre schema.sql y fix_rls.sql**.

---

### M-02 · `databaseService.js` — `getOrders` hace SELECT `*` trayendo toda la columna JSONB

**Archivo:** `src/utils/databaseService.js` · Líneas 141–146  
**Descripción:**  
La consulta trae todas las columnas (`*`) incluyendo `hardware_data` y `datos_cliente` que son columnas JSONB potencialmente grandes (con arrays de equipos, mediciones, etc.). Para la vista de listado del panel, solo se necesitan metadatos (estado, técnico, fecha). Esto genera **transferencia de datos innecesaria** en cada carga del panel.

---

### M-03 · `Header.jsx` — `useEffect` con dependencia externa (`session.email`) no reactiva

**Archivo:** `src/components/layout/Header.jsx` · Líneas 44–63  
**Descripción:**  
`session` se obtiene de `getSession()` (llamada síncrona a localStorage) **fuera** del `useEffect`, en el cuerpo del componente. Si `session` cambia (por ejemplo, después de un logout/login sin recarga completa), el `useEffect` con `[session.email]` no se volvería a disparar porque `session` no es estado React, es solo una lectura de localStorage. La dependencia es una **variable derivada, no reactiva**.

---

### M-04 · `FormularioTecnico.jsx` — Autoguardado sin debounce real

**Archivo:** `src/pages/FormularioTecnico.jsx` · Líneas 87–95  
**Descripción:**  
El `useEffect` de autoguardado se ejecuta en **cada cambio de estado** de `equipos`, `mediciones`, `winboxes` o `televisores`. Cada keystroke en un input de medición dispara una escritura a `localStorage`. Aunque `localStorage.setItem` es síncrono y rápido, en dispositivos de campo de baja gama con arrays grandes, esto puede bloquear el hilo principal por microsegundos acumulativos.

**Solución:** Implementar un debounce real con `useRef` + `setTimeout`:
```js
useEffect(() => {
  const timer = setTimeout(() => {
    saveDraft(codigoCliente, { equipos, mediciones, winboxes, televisores });
  }, 800); // esperar 800ms de inactividad
  return () => clearTimeout(timer);
}, [equipos, mediciones, winboxes, televisores, codigoCliente]);
```

---

### M-05 · `constants.js` — `getRssiStyle` acepta string `"0"` como válido

**Archivo:** `src/utils/constants.js` · Línea 44  
**Descripción:**  
La guarda `if (!rssiStr || isNaN(rssiStr))` considera `"0"` como válido y lo pasará al evaluador. Un RSSI de `0` dBm es físicamente imposible en una medición de campo (los valores reales son siempre negativos). Debería validarse que el valor sea negativo antes de evaluar.

---

### M-06 · `PanelAdmin.jsx` — Índice del array como `key` en listas dinámicas

**Archivo:** `src/pages/PanelAdmin.jsx` · Líneas 715, 474, 475  
**Descripción:**  
Se usa `key={i}` (índice del array) en múltiples listas dinámicas (tabla de usuarios, tabla de equipos dentro de órdenes). React usa el `key` para reconciliar el DOM. Si un usuario es eliminado o reordenado, React puede reutilizar el DOM de otro elemento, causando **renders incorrectos y estado de componente mezclado**.

**Solución:** Usar `key={u.email}` para usuarios y `key={eq.id}` para equipos.

---

## 🔵 BAJOS

### B-01 · `.env` — Valor de `VITE_SUPABASE_ANON_KEY` con formato incorrecto

**Archivo:** `.env` · Línea 2  
**Descripción:**  
El valor de la `anon_key` tiene formato `sb_publishable_Klt8...` que corresponde al **nuevo formato de Supabase (2024)**. El cliente `@supabase/supabase-js@^2.39.0` puede o no ser compatible con este formato dependiendo de la versión exacta instalada. Las versiones `< 2.45` esperaban JWT format. Verificar que el cliente instalado efectivamente soporte este formato.

---

### B-02 · `vite.config.js` — Detección de Vercel por variable de entorno no oficial

**Archivo:** `vite.config.js` · Línea 7  
**Descripción:**  
`process.env.VERCEL` es una variable que Vercel inyecta en el entorno de build, no en runtime del browser. Este patrón es correcto para diferenciar el `base` path, pero debería documentarse explícitamente. Si se cambia de plataforma (ej. Netlify o GitHub Pages), esta lógica quedaría silenciosamente rota.

---

### B-03 · `authService.js` — `initDefaultUsers` exportada como función vacía

**Archivo:** `src/utils/authService.js` · Línea 62  
**Descripción:**  
```js
export const initDefaultUsers = () => {};
```
Esta función fue vaciada en alguna refactorización pero sigue siendo importada y llamada en `Login.jsx` (línea 5 y 57). Es código muerto que ocupa espacio en el bundle y confunde a futuros mantenedores.

---

### B-04 · `Login.jsx` — Validación de email antes que de campos vacíos

**Archivo:** `src/pages/Login.jsx` · Líneas 88–102  
**Descripción:**  
El orden de las validaciones en `handleLogin` es: (1) valida email, (2) valida captcha, (3) valida `!email || !password`. El check de campos vacíos debería ir **primero** antes de cualquier validación de formato, para dar el mensaje de error más claro al usuario.

---

### B-05 · `PanelAdmin.jsx` — `session` obtenido en `useEffect` pero no actualizado como estado

**Archivo:** `src/pages/PanelAdmin.jsx` · Líneas 65–77  
**Descripción:**  
`setSession(sess)` se llama una vez en el `useEffect` de inicialización. Si la sesión de localStorage cambiara externamente (en otra pestaña), el componente no se enteraría. Menor impacto ya que es un panel de admin, pero inconsistente con el patrón del Header.

---

### B-06 · Ausencia total de `PropTypes` o TypeScript

**Archivos:** Todos los componentes `.jsx`  
**Descripción:**  
El proyecto tiene `@types/react` instalado como devDependency pero **no usa TypeScript** (archivos `.jsx`, no `.tsx`). Los componentes no tienen `PropTypes`. Esto aumenta el riesgo de errores en runtime por props incorrectas (ej. pasar `null` donde se espera un array) y dificulta el mantenimiento. La prop `equipos` en `TopologiaRed` asume que siempre es un array, pero si llega `null`, `.find()` y `.filter()` crashearán.

---

### B-07 · `FormularioTecnico.jsx` — Modal de resumen propio en lugar de usar `UIProvider`

**Archivo:** `src/pages/FormularioTecnico.jsx` · Líneas 418–472  
**Descripción:**  
Se implementa un modal de resumen con JSX propio (`modal-overlay`, `modal-content`) en lugar de usar el sistema de modales centralizado de `UIProvider`. Esto duplica estilos, lógica de overlay y manejo de z-index. Si el modal global cambia de diseño, este no se actualizará.

---

### B-08 · `BuscadorCliente.jsx` — Notificaciones no persistidas en Supabase

**Archivo:** `src/utils/authService.js` · Líneas 40–47  
**Descripción:**  
El sistema de notificaciones (aprobación/rechazo de órdenes) usa **exclusivamente localStorage**. Si el técnico cierra sesión, borra datos del navegador, o usa otro dispositivo, las notificaciones se pierden. El sistema de Realtime ya está integrado, pero las notificaciones no se guardan en Supabase.

---

## TABLA RESUMEN DE RIESGOS PRIORITARIOS

| ID | Archivo | Severidad | Impacto |
|----|---------|-----------|---------|
| C-01 | authService.js | 🔴 CRÍTICO | Creación de usuarios sin autenticación de Admin real |
| C-02 | authService.js | 🔴 CRÍTICO | Usuarios huérfanos en auth.users tras delete |
| C-03 | authService.js | 🔴 CRÍTICO | Reset de contraseña completamente no funcional |
| C-04 | ProtectedRoute.jsx | 🔴 CRÍTICO | Guard de rutas bypasseable desde DevTools |
| A-01 | main.jsx | 🟠 ALTO | UIProvider duplicado, memoria desperdiciada |
| A-02 | BuscadorCliente.jsx | 🟠 ALTO | Búsqueda de clientes con datos mock en producción |
| A-03 | authService.js | 🟠 ALTO | actor_id faltante en todos los logs de auditoría |
| A-04 | PanelAdmin.jsx | 🟠 ALTO | Pestaña de auditoría renderizada dos veces |
| A-05 | FormularioTecnico.jsx | 🟠 ALTO | CSV en blanco descargable antes de generar contenido |
| A-06 | TopologiaRed.jsx | 🟠 ALTO | `showToast` no definido — ReferenceError en runtime |
| A-07 | PanelAdmin.jsx | 🟠 ALTO | Stale closure en Realtime subscription |

---

## PLAN DE ACCIÓN RECOMENDADO (Por prioridad)

### Fase 1 — Inmediato (Bloquea producción)
1. **A-06**: Agregar `const { showToast } = useUI();` en `TopologiaRed.jsx`
2. **A-04**: Eliminar el bloque duplicado de la pestaña AUDITORÍA en `PanelAdmin.jsx`
3. **A-01**: Eliminar `UIProvider` duplicado de `main.jsx`
4. **B-03**: Eliminar la importación y llamada de `initDefaultUsers` en `Login.jsx`

### Fase 2 — Corto plazo (Próximo sprint)
5. **C-04**: Agregar verificación de sesión Supabase real en `App.jsx`
6. **A-05**: Corregir `doDescargarCSV` para llamar `generateCSVContent()` directamente
7. **A-03**: Agregar `actor_id: session?.id` al payload de `addAuditLog`
8. **M-04**: Implementar debounce en el autoguardado
9. **M-06**: Cambiar `key={i}` por IDs estables en todas las listas

### Fase 3 — Medio plazo (Arquitectura)
10. **C-01, C-02, C-03**: Migrar operaciones Admin Auth a **Supabase Edge Functions**
11. **A-02**: Integrar búsqueda real de clientes contra BD o API de CRM
12. **B-06**: Migrar a TypeScript (`.tsx`) o añadir `PropTypes` en todos los componentes
13. **B-08**: Persistir notificaciones en tabla Supabase para multi-dispositivo
