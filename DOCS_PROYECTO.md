# FormularioTecnico - Documentación Global del Proyecto

## 📋 Descripción General

**FormularioTecnico** es una aplicación web progresiva (PWA-ready) diseñada para los técnicos de campo de **WIN Perú (ISP)**. Permite registrar digitalmente las instalaciones de fibra óptica, capturando topologías de red, mediciones de cobertura Wi-Fi, configuración de decodificadores WINBOX y dispositivos Smart TV (WinTV).

La aplicación opera **100% offline** mediante `localStorage`, sin necesidad de backend o base de datos externa en su estado actual.

---

## 🏗️ Arquitectura del Proyecto

```
FormularioTecnico/
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions: Build + Deploy a GH Pages
├── public/                     # Assets estáticos
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx      # Barra de navegación (branding, tema, logout)
│   │   │   ├── Header.css
│   │   │   └── ProtectedRoute.jsx  # Guard de autenticación por roles
│   │   ├── features/
│   │   │   ├── TopologiaRed.jsx    # Editor visual de topología de red
│   │   │   ├── FormularioMediciones.jsx  # Registro de mediciones Wi-Fi
│   │   │   ├── FormularioWinbox.jsx     # Registro de decodificadores
│   │   │   └── FormularioWintv.jsx      # Registro de Smart TVs
│   │   └── ui/
│   │       └── index.jsx       # Componentes UI reutilizables (Card, Button, Input, Select)
│   ├── pages/
│   │   ├── Login.jsx           # Pantalla de acceso con captcha
│   │   ├── Login.css
│   │   ├── BuscadorCliente.jsx # Buscador de órdenes + historial
│   │   ├── BuscadorCliente.css
│   │   ├── FormularioTecnico.jsx   # Formulario principal de instalación
│   │   ├── FormularioTecnico.css
│   │   ├── PanelAdmin.jsx      # Panel de supervisión y administración
│   │   └── PanelAdmin.css
│   ├── utils/
│   │   ├── authService.js      # Servicio de autenticación y CRUD de usuarios
│   │   └── constants.js        # Constantes (ubicaciones, evaluación RSSI)
│   ├── App.jsx                 # Router principal con rutas protegidas
│   ├── main.jsx                # Punto de entrada de React
│   └── index.css               # Variables CSS globales y tema
├── vite.config.js              # Configuración de Vite
├── package.json
└── DOCS_PROYECTO.md            # Este archivo
```

---

## 🔐 Sistema de Autenticación

### Flujo de Login

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Login.jsx │────▶│ authService  │────▶│  localStorage    │
│  (Captcha)  │     │  .login()    │     │  'win_users'     │
└─────────────┘     └──────────────┘     │  'win_session'   │
                                          └──────────────────┘
```

### Roles y Permisos

| Rol | Acceso | Capacidades |
|-----|--------|-------------|
| **ADMINISTRADOR** | `/admin` | Ver TODAS las órdenes, gestionar usuarios (CRUD), aprobar/rechazar |
| **SUPERVISOR** | `/admin` | Ver órdenes, aprobar/rechazar. SIN gestión de usuarios |
| **TECNICO** | `/buscar` → `/formulario` | Buscar OTs, llenar formulario, enviar reportes |

### Usuarios Semilla (Demo)

| Email | Contraseña | Rol | Cuadrilla |
|-------|-----------|-----|-----------|
| `admin` | `admin` | ADMINISTRADOR | GERENCIA |
| `super` | `super` | SUPERVISOR | LIMA-NTE-01 |

> Los técnicos se auto-registran al loguearse por primera vez con email + contraseña + cuadrilla.

### Bloqueo de Cuentas
- El Administrador puede **bloquear** cualquier cuenta (excepto al último admin activo).
- Un usuario bloqueado ve el mensaje: *"Tu cuenta ha sido bloqueada por el Administrador"*.

---

## 🗂️ Flujo de Datos

### Claves de localStorage

| Clave | Tipo | Descripción |
|-------|------|-------------|
| `win_session` | Object | Sesión activa: `{ email, role, cuadrilla }` |
| `win_users` | Array | Lista de usuarios registrados con contraseñas |
| `win_orders` | Array | Órdenes de trabajo con equipos, mediciones, CSV |

### Ciclo de Vida de una Orden

```
EN PROCESO ──▶ ENVIADO ──▶ APROBADO
                        └──▶ RECHAZADO
```

1. **EN PROCESO**: El técnico está llenando el formulario (auto-guardado continuo).
2. **ENVIADO**: El técnico finalizó y envió al supervisor.
3. **APROBADO / RECHAZADO**: El supervisor/admin revisó y dictaminó.

---

## 🎨 Sistema de Diseño

### Paleta de Colores (Identidad WIN)

| Variable CSS | Color | Uso |
|-------------|-------|-----|
| `--win-orange` | `#FF6B00` | Primario, branding WIN |
| `--win-orange-dark` | `#cc5600` | Gradientes, hover |
| `--win-bg-dark` | `#121212` | Fondo principal (modo oscuro) |
| `--win-bg-surface` | `#1E1E1E` | Superficies elevadas |
| `--text-primary` | `#FFFFFF` | Texto principal |
| `--text-secondary` | `#B0B0B0` | Texto secundario |
| `--success` | `#2ECA7F` | Estados positivos |
| `--error` | `#FF4D4D` | Estados negativos |

### Tipografía
- **Font Family**: `Outfit` (Google Fonts), fallback a system fonts.

### Modo Claro
- Activado con la clase `body.light-theme` (toggle en Header).

---

## 📊 Reportes CSV

### Estructura del Archivo Exportado

El CSV generado contiene 3 secciones separadas por líneas vacías:

1. **Mediciones Wi-Fi**: S/N del router, gestionabilidad, ambiente, piso, velocidades 2.4G/5G, RSSI, evaluación de señal, dependencia, tipo de conexión.
2. **Decodificadores WINBOX**: S/N, ambiente, equipo padre, modo conexión (cable/Wi-Fi), banda, velocidad, RSSI.
3. **Streaming WinTV**: Ambiente, marca, modelo, modalidad de red.

### Compatibilidad Excel
- Se usa **BOM (`\uFEFF`)** + **Blob** para garantizar que los caracteres latinos (ñ, tildes, °) se muestren correctamente al abrir en Excel.

---

## 🛡️ Seguridad Actual

### Implementado
- ✅ Captcha matemático anti-bot en login.
- ✅ Rutas protegidas por rol (`ProtectedRoute`).
- ✅ Guard de código de cliente (no se puede acceder a `/formulario` sin pasar por el buscador).
- ✅ Protección contra eliminación del último administrador.

### Pendiente para Producción
- ⚠️ Contraseñas almacenadas en texto plano (necesita hashing con bcrypt en backend).
- ⚠️ Sin tokens JWT (localStorage como sesión efímera).
- ⚠️ Sin HTTPS forzado en el servidor.
- ⚠️ Sin rate-limiting para intentos de login.

---

## 🚀 Guía de Desarrollo Local

### Requisitos
- Node.js v18+
- npm v9+

### Instalación
```bash
git clone https://github.com/JRenato99/FormularioTecnico.git
cd FormularioTecnico
npm install
```

### Ejecución en Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173/FormularioTecnico/`

### Build de Producción
```bash
npm run build
```
Los archivos compilados se generan en `./dist/`.

### Preview del Build
```bash
npx vite preview
```

---

## 📡 Despliegue

### GitHub Pages (Actual)
- **URL**: `https://jrenato99.github.io/FormularioTecnico/`
- **Workflow**: `.github/workflows/deploy.yml`
- **Trigger**: Push a la rama `main`.
- **Proceso**: `npm install` → `npm run build` → Upload `./dist/` → Deploy Pages.

### Configuración Vite
```javascript
// vite.config.js
base: process.env.VERCEL ? '/' : '/FormularioTecnico/'
```

---

## 📝 Control de Cambios

### Sesión 3 (Abril 2026)
- **authService.js**: Servicio centralizado de autenticación con CRUD de usuarios persistente.
- **Header.jsx**: Botón de cerrar sesión + badge de rol coloreado.
- **Login.jsx**: Validación contra authService, mensajes de error inline, inicialización de usuarios semilla.
- **FormularioTecnico.jsx**: Guard de ruta que impide acceso sin código de cliente.
- **PanelAdmin.jsx**: Rediseño completo con acordeón expandible (topología, mediciones, winboxes, TVs), CRUD real de usuarios, diferenciación ADMINISTRADOR vs SUPERVISOR.
- **Limpieza global**: Código documentado con JSDoc, eliminación de código muerto, CSS organizado por secciones.

### Sesión 2 (Abril 2026)
- Captcha matemático en login.
- Auto-guardado en localStorage.
- Soporte para APs de terceros (no gestionables).
- Modal de resumen pre-envío.
- Exportación CSV con BOM para Excel.

### Sesión 1 (Abril 2026)
- Estructura inicial con Vite + React.
- Topología de red visual (ONT → APs → Extensores).
- Formulario de mediciones Wi-Fi dual-band.
- Módulos WINBOX y WinTV.
- Despliegue en GitHub Pages.
