# Roadmap: Del Estado Actual a Producción

Este documento detalla los pasos necesarios para llevar **FormularioTecnico** desde su estado actual (demo funcional con persistencia local) hasta un producto listo para producción empresarial.

---

## 📍 Estado Actual (v0.3 - Demo Funcional)

✅ Frontend React + Vite desplegado en GitHub Pages  
✅ Sistema de roles (Administrador / Supervisor / Técnico)  
✅ Captcha anti-bot  
✅ Formulario completo (Topología, Mediciones, Winbox, WinTV)  
✅ Exportación CSV compatible con Excel  
✅ Persistencia 100% en localStorage  
✅ Diseño responsive con tema claro/oscuro  

---

## 🛣️ Fases del Roadmap

### Fase 1: Backend y Base de Datos 🔴 (Crítico) [✅ COMPLETADO CON SUPABASE]
> **Objetivo**: Reemplazar localStorage por un backend real.

| Paso | Descripción | Prioridad | Estado |
|------|-------------|-----------|--------|
| 1.1 | Crear proyecto Backend Serverless (Supabase) | Alta | ✅ Listo |
| 1.2 | Configurar PostgreSQL con esquema de tablas | Alta | ✅ Listo |
| 1.3 | Implementar Edge Functions para autenticación/usuarios | Alta | ✅ Listo |
| 1.4 | Implementar tabla `win_orders` con RLS | Alta | ✅ Listo |
| 1.5 | Migrar `authService.js` para consumir Supabase | Alta | ✅ Listo |
| 1.6 | Migrar auto-guardado para sincronizar con el servidor | Alta | ✅ Listo |

**Tecnologías actuales**: React + Supabase (Edge Functions / PostgreSQL + RLS)

---

### Fase 2: Autenticación Segura 🔴 (Crítico)
> **Objetivo**: Proteger el acceso con estándares de la industria.

| Paso | Descripción | Prioridad |
|------|-------------|-----------|
| 2.1 | Implementar JWT (JSON Web Tokens) con access + refresh tokens | Alta |
| 2.2 | Middleware de autenticación en Express que valide el JWT en cada request | Alta |
| 2.3 | Rate-limiting para `/api/auth/login` (máx. 5 intentos / 15 min) | Alta |
| 2.4 | Reemplazar captcha matemático por Google reCAPTCHA v3 | Media |
| 2.5 | Expiración de sesión configurable (ej. 8 horas de jornada laboral) | Media |
| 2.6 | Recuperación de contraseña por email (opcional) | Baja |

---

### Fase 3: Modo Offline Real (PWA) 🟡 (Importante)
> **Objetivo**: Los técnicos trabajan en zonas sin cobertura. La app debe funcionar offline.

| Paso | Descripción | Prioridad |
|------|-------------|-----------|
| 3.1 | Registrar un Service Worker con Workbox | Alta |
| 3.2 | Cachear assets estáticos (HTML, CSS, JS, fuentes) | Alta |
| 3.3 | Implementar cola de sincronización: guardar localmente y enviar al servidor cuando haya conexión | Alta |
| 3.4 | Indicador visual de estado online/offline en el Header | Media |
| 3.5 | Archivo `manifest.json` para instalación como app en Android/iOS | Media |
| 3.6 | Splash screen y íconos de app | Baja |

---

### Fase 4: Integración con Sistemas WIN 🟡 (Importante)
> **Objetivo**: Conectar con la infraestructura existente de WIN.

| Paso | Descripción | Prioridad |
|------|-------------|-----------|
| 4.1 | API de búsqueda de clientes real (reemplazar mock del BuscadorCliente) | Alta |
| 4.2 | Integración con el sistema de OTs (Órdenes de Trabajo) de WIN | Alta |
| 4.3 | Exportación directa a SharePoint/OneDrive corporativo | Media |
| 4.4 | Notificaciones push al Supervisor cuando un técnico envía un formulario | Media |
| 4.5 | Dashboard de métricas en tiempo real (formularios/día, tasa de aprobación) | Baja |

---

### Fase 5: Testing y Calidad 🟢 (Deseable)
> **Objetivo**: Garantizar estabilidad antes del despliegue masivo.

| Paso | Descripción | Prioridad |
|------|-------------|-----------|
| 5.1 | Unit tests con Vitest para `authService.js` y funciones de utilidad | Alta |
| 5.2 | Tests de componentes con React Testing Library | Media |
| 5.3 | Tests E2E con Playwright (flujo completo: login → formulario → envío → aprobación) | Media |
| 5.4 | Linting con ESLint + Prettier configurado | Media |
| 5.5 | Husky + lint-staged para pre-commit hooks | Baja |

---

### Fase 6: Despliegue Empresarial 🔴 (Crítico)
> **Objetivo**: Mover de GitHub Pages a infraestructura controlada.

| Paso | Descripción | Prioridad |
|------|-------------|-----------|
| 6.1 | Configurar servidor en la nube (AWS/Azure/VPS propio de WIN) | Alta |
| 6.2 | Deploy del backend con PM2 o Docker | Alta |
| 6.3 | Deploy del frontend en Nginx como SPA (con redirect para rutas del router) | Alta |
| 6.4 | Certificado SSL (Let's Encrypt) para HTTPS obligatorio | Alta |
| 6.5 | Variables de entorno con `.env` (DB_URL, JWT_SECRET, etc.) | Alta |
| 6.6 | Dominio personalizado (ej. `tecnico.win.pe`) | Media |
| 6.7 | Pipeline CI/CD (GitHub Actions → Build → Test → Deploy) | Media |
| 6.8 | Monitoreo con Sentry (errores frontend) + logs del backend | Baja |

---

### Fase 7: UX Avanzado 🟢 (Deseable)
> **Objetivo**: Pulir la experiencia para uso diario por técnicos de campo.

| Paso | Descripción | Prioridad |
|------|-------------|-----------|
| 7.1 | Cámara integrada para fotos de la instalación (adjuntar a la orden) | Alta |
| 7.2 | Firma digital del cliente en pantalla táctil | Alta |
| 7.3 | GPS automático para registrar la ubicación de la visita | Media |
| 7.4 | Validaciones inteligentes (alertar si la topología parece incompleta) | Media |
| 7.5 | Exportación a PDF con formato profesional de WIN | Media |
| 7.6 | Historial de cambios en cada orden (quién y cuándo modificó) | Baja |
| 7.7 | Tutoriales interactivos para técnicos nuevos | Baja |

---

## 📊 Priorización Visual

```
                IMPACTO
                  ▲
                  │
            ┌─────┤ Fase 1 (Backend)
            │     │ Fase 2 (Auth Segura)
  CRÍTICO ──┤     │ Fase 6 (Deploy Empresarial)
            │     │
            └─────┤ Fase 3 (PWA Offline)
                  │ Fase 4 (Integración WIN)
  IMPORTANTE ─────┤
                  │ Fase 5 (Testing)
  DESEABLE ───────┤ Fase 7 (UX Avanzado)
                  │
                  └──────────────────────▶ ESFUERZO
```

---

## ⏱️ Estimación de Tiempos

| Fase | Estimación | Depende de |
|------|-----------|------------|
| Fase 1 | 2-3 semanas | — |
| Fase 2 | 1 semana | Fase 1 |
| Fase 3 | 1-2 semanas | Fase 1 |
| Fase 4 | 2-4 semanas | Fase 1, APIs de WIN |
| Fase 5 | 1-2 semanas | Fase 1 |
| Fase 6 | 1 semana | Fase 1, Fase 2 |
| Fase 7 | Continuo | Fase 6 |

**Total estimado hasta MVP en producción (Fases 1+2+6):** ~4-5 semanas de desarrollo.

---

## ✅ Criterios de "Listo para Producción"

- [ ] Backend desplegado con PostgreSQL en producción
- [ ] Autenticación con JWT y contraseñas hasheadas
- [ ] HTTPS obligatorio
- [ ] Al menos 1 test E2E del flujo completo
- [ ] Variables de entorno separadas (dev/staging/prod)
- [ ] Monitoreo de errores activo
- [ ] Capacitación básica a técnicos y supervisores
- [ ] Aprobación del equipo de TI de WIN
