-- ============================================================================
-- Perfil CONSULTOR: supervisor de SOLO LECTURA que ve TODAS las órdenes
-- ============================================================================
-- Requerimiento: un perfil tipo "consultor" que pueda VER todas las órdenes
-- (sin filtro SGI/SGA) y descargar sus PDF/Excel, pero SIN poder aprobar ni
-- rechazar (solo lectura) y SIN acceso a gestión de usuarios ni auditoría.
--
-- Implementación: se reutiliza el rol SUPERVISOR con un tercer valor de
-- supervisor_tipo = 'CONSULTOR'.
--   * Las pestañas Usuarios/Auditoría ya están restringidas a ADMINISTRADOR en
--     el frontend, así que el CONSULTOR no las ve.
--   * El botón Aprobar/Rechazar se oculta en el frontend para CONSULTOR.
--   * DEFENSA EN PROFUNDIDAD: NO se agrega CONSULTOR a la política de UPDATE,
--     por lo que aunque alguien intente un UPDATE directo por API, RLS lo
--     bloquea. El CONSULTOR es de lectura real a nivel base de datos.
--
-- Aplicar en: Supabase → SQL Editor (o supabase db push). Idempotente.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 1 — Ampliar el CHECK de supervisor_tipo para admitir 'CONSULTOR'
-- ----------------------------------------------------------------------------
ALTER TABLE public.win_users
  DROP CONSTRAINT IF EXISTS win_users_supervisor_tipo_check;

ALTER TABLE public.win_users
  ADD CONSTRAINT win_users_supervisor_tipo_check
  CHECK (supervisor_tipo IN ('SGI', 'SGA', 'CONSULTOR'));


-- ============================================================================
-- SECCIÓN 2 — Política de LECTURA: el CONSULTOR ve TODAS las órdenes
-- ----------------------------------------------------------------------------
-- Mantiene las ramas existentes (ADMIN ve todo, TECNICO ve las suyas,
-- SGI/SGA filtran por tipoServicio) y añade la rama CONSULTOR sin filtro.
DROP POLICY IF EXISTS "Lectura de ordenes" ON public.win_orders;

CREATE POLICY "Lectura de ordenes" ON public.win_orders
FOR SELECT USING (
  public.current_user_role() = 'ADMINISTRADOR'
  OR tecnico_id = auth.uid()
  OR (
    public.current_user_role() = 'SUPERVISOR'
    AND public.current_user_supervisor_tipo() = 'SGI'
    AND COALESCE(datos_cliente ->> 'tipoServicio', 'Instalación Nueva') = 'Instalación Nueva'
  )
  OR (
    public.current_user_role() = 'SUPERVISOR'
    AND public.current_user_supervisor_tipo() = 'SGA'
    AND datos_cliente ->> 'tipoServicio' = 'Post-Venta'
  )
  OR (
    -- CONSULTOR: ve TODAS las órdenes, sin filtro de tipoServicio.
    public.current_user_role() = 'SUPERVISOR'
    AND public.current_user_supervisor_tipo() = 'CONSULTOR'
  )
);


-- ============================================================================
-- SECCIÓN 3 — La política de ACTUALIZACIÓN se deja INTACTA a propósito
-- ----------------------------------------------------------------------------
-- "Actualizacion de ordenes" (migración 20260605) NO incluye la rama CONSULTOR.
-- Por eso un CONSULTOR no puede aprobar/rechazar/editar ninguna orden vía API:
-- RLS rechaza cualquier UPDATE suyo. Esto hace que "solo lectura" sea real y no
-- dependa únicamente de ocultar botones en el frontend.


-- ============================================================================
-- SECCIÓN 4 — Asignar el tipo CONSULTOR a un usuario (PASO MANUAL, opcional)
-- ----------------------------------------------------------------------------
-- El CONSULTOR se crea desde el Panel de Admin (rol Supervisor → tipo Consultor),
-- o se reclasifica un supervisor existente con:
--
-- UPDATE public.win_users SET supervisor_tipo = 'CONSULTOR' WHERE email = 'consultor@win.pe';
--
-- Para listar supervisores y su tipo:
--   SELECT email, role, supervisor_tipo FROM public.win_users WHERE role = 'SUPERVISOR';
