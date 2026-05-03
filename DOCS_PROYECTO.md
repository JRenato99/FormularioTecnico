# FormularioTecnico - Documentación Global del Proyecto

## 📋 Descripción General

**FormularioTecnico** es una aplicación web progresiva (PWA-ready) diseñada para los técnicos de campo de **WIN Perú (ISP)**. Permite registrar digitalmente las instalaciones de fibra óptica, capturando topologías de red, mediciones de cobertura Wi-Fi, configuración de decodificadores WINBOX y dispositivos Smart TV (WinTV).

El proyecto se encuentra en la **Fase 5 (Migración a Backend)**, donde se está reemplazando el `localStorage` original por una base de datos segura en la nube mediante **Supabase**.

---

## 🏗️ Arquitectura del Proyecto

```text
FormularioTecnico/
├── public/                     # Assets estáticos
├── src/
│   ├── components/
│   │   ├── layout/           # Componentes de envoltura (Header, ProtectedRoute)
│   │   ├── features/         # Componentes core (TopologiaRed, Formularios de Registro)
│   │   └── ui/               # Componentes UI reutilizables (Card, Button, Input, Select)
│   ├── pages/
│   │   ├── Login.jsx         # Pantalla de acceso
│   │   ├── BuscadorCliente.jsx # Buscador de órdenes + historial
│   │   ├── FormularioTecnico.jsx # Formulario principal de instalación
│   │   └── PanelAdmin.jsx    # Panel de supervisión y administración (CRUD usuarios)
│   ├── utils/
│   │   ├── supabaseClient.js # Cliente inicializado de Supabase
│   │   ├── authService.js    # Servicio centralizado que conecta Supabase Auth con React
│   │   └── constants.js      # Constantes (ubicaciones, evaluación RSSI)
│   ├── App.jsx               # Router principal con rutas protegidas
│   ├── main.jsx              # Punto de entrada de React
│   └── index.css             # Variables CSS globales y tema (WIN-Peru)
├── supabase/
│   ├── schema.sql            # Definición completa de la BD, Tablas y RLS en Postgres
│   └── fix_rls.sql           # Script de corrección de seguridad y recursión de políticas
└── vite.config.js            # Configuración de Vite
```

---

## 🔐 Sistema de Autenticación y Seguridad (Supabase Auth)

El sistema de autenticación ha sido migrado completamente a **Supabase Auth**. Atrás quedó la persistencia insegura en el navegador.

### Flujo de Login Asíncrono
1. El usuario ingresa credenciales en `/login`.
2. `authService.js` autentica el correo y contraseña contra `supabase.auth.signInWithPassword`.
3. Si el login es exitoso, se consulta la tabla `win_users` usando el `id` para obtener el **Rol** y **Cuadrilla**.
4. Se revisa si el estado del usuario es `BLOQUEADO`. Si lo es, se rechaza la sesión.
5. Se inserta silenciosamente un registro en `win_audit_logs`.

### Roles y Permisos (Protegidos por RLS en Base de Datos)
| Rol | Acceso UI | Permisos Base de Datos (RLS) |
|-----|-----------|------------------------------|
| **ADMINISTRADOR** | `/admin` | Lectura total, CRUD Usuarios, Aprobación de Órdenes, Vista Logs |
| **SUPERVISOR** | `/admin` | Lectura de Órdenes, Aprobación/Rechazo de Órdenes |
| **TECNICO** | `/buscar` → `/formulario` | Escritura de Órdenes (Draft/Final), Lectura de sus propias órdenes |

### Auditoría Completa (`win_audit_logs`)
Todo evento crítico en la aplicación es registrado en la base de datos de manera automática, sin bloquear la interfaz:
- `LOGIN` y `LOGOUT`
- `CREAR_USUARIO`, `BLOQUEAR_USUARIO`, `ELIMINAR_USUARIO`
- `APROBAR_ORDEN`, `RECHAZAR_ORDEN`

---

## 🗂️ Flujo de Datos (En Transición)

Actualmente, las órdenes de trabajo siguen un **Modelo Híbrido** (El próximo paso del Roadmap es migrar esto a la nube al 100%).

### Ciclo de Vida de una Orden
```text
EN PROCESO (Draft Local) ──▶ ENVIADO (A Nube) ──▶ APROBADO (En Nube)
                                                 └──▶ RECHAZADO (En Nube)
```

1. **EN PROCESO (Offline-First)**: El técnico llena el formulario. Los datos se autoguardan de forma silenciosa en la memoria del navegador cada vez que teclea. Esto lo protege de cortes de internet en la casa del cliente.
2. **ENVIADO (Envío Final)**: *[FASE PRÓXIMA]* Al terminar, presiona Enviar, el sistema se conecta a internet y dispara el JSON hacia la tabla `win_orders` en Supabase.
3. **DICTAMEN**: El Administrador ve la orden en tiempo real y cambia su estado.

---

## 🎨 Sistema de Diseño y UI/UX

El diseño de la aplicación cumple los más altos estándares visuales (Glassmorphism, variables dinámicas, responsividad total) y sigue la identidad corporativa de WIN Perú.

### Tipografía y Componentes Premium
- Uso de `Outfit` (Google Fonts).
- Componentes modulares y autocontenidos en `ui/index.jsx`.
- **Topología de Red Mejorada**: Las líneas de la topología están construidas matemáticamente con posicionamiento absoluto para garantizar que los nodos y troncales no se desfasen independientemente del tamaño de la pantalla.

---

## 📝 Control de Cambios / Roadmap

### Fase 5 (Mayo 2026) - Actual
- ✅ **Backend Conectado**: Instalación de `@supabase/supabase-js`.
- ✅ **Auth Migrada**: Refactorización de `authService.js` para usar las APIs de la nube en vez de LocalStorage.
- ✅ **Admin Panel Conectado**: CRUD de usuarios desde React conectado directamente a `public.win_users` en Supabase.
- ✅ **Resolución de Conflictos RLS**: Corrección de bucles de recursión infinita en las políticas de seguridad en PostgreSQL. Corrección del naming `ADMIN` a `ADMINISTRADOR`.
- ✅ **Fix UI Topología**: Refactorizado CSS de TopologiaRed usando `position: absolute` para evitar deformaciones en Flexbox y corregir renderizado móvil.
- ⏳ **PENDIENTE**: Refactorizar `FormularioTecnico.jsx` para despachar el objeto final a Supabase.

### Fases Anteriores (Abril 2026)
- Definición y programación de `schema.sql`.
- Generación de PDF de Topología utilizando `html2canvas` y `jsPDF`.
- Generador y Exportador de archivos CSV optimizado para Microsoft Excel (usando BOM `\uFEFF`).
- Enrutamiento protegido por guards.
- Implementación del Captcha Matemático.
